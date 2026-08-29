import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Tool } from '@/types/api';
import {
  executeToolAction,
  invalidateToolCaches,
  toolKeys,
  toolService,
  type ToolAction,
  type ToolActionPayload,
} from '@/services/tool-service';
import { successMessages, toolRequestErrorMessage } from './tool-ui';

export function useToolActions(organizationId: number) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ToolAction | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const responsiblesQuery = useQuery({
    queryKey: toolKeys.transferResponsibles(organizationId),
    queryFn: toolService.transferResponsibles,
    enabled: organizationId > 0 && action === 'transfer',
  });

  const mutation = useMutation({
    mutationFn: executeToolAction,
    onSuccess: async (_result, request) => {
      setFeedback(successMessages[request.action]);
      setAction(null);
      setTool(null);
      await invalidateToolCaches(queryClient, organizationId);
    },
  });

  const open = useCallback((nextAction: ToolAction, selectedTool: Tool | null = null) => {
    mutation.reset();
    setAction(nextAction);
    setTool(selectedTool);
  }, [mutation]);

  const close = useCallback(() => {
    if (mutation.isPending) return;
    mutation.reset();
    setAction(null);
    setTool(null);
  }, [mutation]);

  const submit = useCallback(async (payload: ToolActionPayload) => {
    if (!action) return;
    try {
      await mutation.mutateAsync({ action, tool, ...payload });
    } catch {
      // A mensagem sanitizada permanece no diálogo.
    }
  }, [action, mutation, tool]);

  return {
    action,
    tool,
    open,
    close,
    submit,
    pending: mutation.isPending,
    error: mutation.error ? toolRequestErrorMessage(mutation.error, action ?? undefined) : null,
    responsibles: responsiblesQuery.data ?? [],
    responsiblesLoading: responsiblesQuery.isLoading,
    responsiblesError: responsiblesQuery.isError,
    feedback,
    clearFeedback: () => setFeedback(null),
  };
}
