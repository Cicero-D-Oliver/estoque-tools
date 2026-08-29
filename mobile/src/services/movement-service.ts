import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StockMovement, ToolMovement } from '@/types/api';

export const movementKeys = {
  root: (organizationId: number) => ['organization', organizationId, 'movements'] as const,
  tools: (organizationId: number) => ['organization', organizationId, 'movements', 'tools'] as const,
  stock: (organizationId: number) => ['organization', organizationId, 'movements', 'stock'] as const,
  pending: (organizationId: number) => ['organization', organizationId, 'movements', 'pending'] as const,
};

const organizationRequest = { organization: true } as const;

export const movementService = {
  listTools: async (): Promise<ToolMovement[]> => (
    await apiClient.get<ToolMovement[]>('/api/movimentacoes-ferramenta', organizationRequest)
  ).data,
  listStock: async (): Promise<StockMovement[]> => (
    await apiClient.get<StockMovement[]>('/api/movimentacoes-estoque', organizationRequest)
  ).data,
  listPending: async (): Promise<ToolMovement[]> => (
    await apiClient.get<ToolMovement[]>('/api/movimentacoes-ferramenta/pendentes', organizationRequest)
  ).data,
  confirm: async (movementId: number): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(
      `/api/movimentacoes-ferramenta/${movementId}/confirmacao`,
      undefined,
      organizationRequest,
    )
  ).data,
};

export async function invalidateMovementCaches(
  queryClient: QueryClient,
  organizationId: number,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
}
