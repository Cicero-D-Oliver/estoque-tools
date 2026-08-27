import { apiClient } from '../lib/api-client'
import type { StockMovement, ToolMovement } from '../types/api'

const organizationRequest = { organization: true } as const

export const movementKeys = {
  all: ['movements'] as const,
  tools: (organizationId: number) => ['movements', organizationId, 'tools'] as const,
  stock: (organizationId: number) => ['movements', organizationId, 'stock'] as const,
  pending: (organizationId: number) => ['movements', organizationId, 'pending'] as const,
}

export const movementService = {
  listTools: () => apiClient.get<ToolMovement[]>('/api/movimentacoes-ferramenta', organizationRequest),
  listStock: () => apiClient.get<StockMovement[]>('/api/movimentacoes-estoque', organizationRequest),
  listPending: () => apiClient.get<ToolMovement[]>('/api/movimentacoes-ferramenta/pendentes', organizationRequest),
  confirm: (movementId: number) => apiClient.post<ToolMovement>(
    `/api/movimentacoes-ferramenta/${movementId}/confirmacao`,
    undefined,
    organizationRequest,
  ),
}
