import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StockItem } from '@/types/api';
import {
  executeInventoryAction,
  invalidateInventoryCaches,
  type InventoryAction,
  type InventoryActionPayload,
} from '@/services/inventory-service';
import { inventoryRequestError, inventorySuccessMessages } from './inventory-ui';

export function useInventoryActions(organizationId: number) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<InventoryAction | null>(null);
  const [item, setItem] = useState<StockItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({
      requestedAction,
      selectedItem,
      payload,
    }: {
      requestedAction: InventoryAction;
      selectedItem: StockItem | null;
      payload: InventoryActionPayload;
    }) => executeInventoryAction(requestedAction, selectedItem, payload),
    onSuccess: async (_result, request) => {
      setFeedback(inventorySuccessMessages[request.requestedAction]);
      setAction(null);
      setItem(null);
      await invalidateInventoryCaches(queryClient, organizationId);
    },
  });

  const open = useCallback((nextAction: InventoryAction, selectedItem: StockItem | null = null) => {
    mutation.reset();
    setAction(nextAction);
    setItem(selectedItem);
  }, [mutation]);

  const close = useCallback(() => {
    if (mutation.isPending) return;
    mutation.reset();
    setAction(null);
    setItem(null);
  }, [mutation]);

  const submit = useCallback(async (payload: InventoryActionPayload) => {
    if (!action) return;
    try {
      await mutation.mutateAsync({ requestedAction: action, selectedItem: item, payload });
    } catch {
      // O diálogo mantém somente a mensagem sanitizada.
    }
  }, [action, item, mutation]);

  return {
    action,
    item,
    open,
    close,
    submit,
    pending: mutation.isPending,
    error: mutation.error ? inventoryRequestError(mutation.error, action ?? undefined) : null,
    feedback,
    clearFeedback: () => setFeedback(null),
  };
}
