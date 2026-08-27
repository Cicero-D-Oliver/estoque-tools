import { apiClient } from '../lib/api-client'
import type { StockItem, StockMovement } from '../types/api'

export interface StockItemInput {
  codigo: string
  nome: string
  categoria?: string
  quantidadeAtual: number
  quantidadeMinima: number
  localizacao?: string
}

export interface StockMovementInput {
  quantidade: number
  observacao?: string
}

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (organizationId: number) => ['inventory', organizationId, 'list'] as const,
  detail: (organizationId: number, itemId: number) => ['inventory', organizationId, 'detail', itemId] as const,
  lowStock: (organizationId: number) => ['inventory', organizationId, 'low-stock'] as const,
  history: (organizationId: number, itemId: number) => ['inventory', organizationId, 'history', itemId] as const,
}

const organizationRequest = { organization: true } as const

export const inventoryService = {
  list: () => apiClient.get<StockItem[]>('/api/itens', organizationRequest),
  get: (itemId: number) => apiClient.get<StockItem>(`/api/itens/${itemId}`, organizationRequest),
  lowStock: () => apiClient.get<StockItem[]>('/api/itens/abaixo-minimo', organizationRequest),
  history: (itemId: number) => apiClient.get<StockMovement[]>(
    `/api/itens/${itemId}/historico`,
    organizationRequest,
  ),
  create: (input: StockItemInput) => apiClient.post<StockItem>('/api/itens', input, organizationRequest),
  update: (itemId: number, input: StockItemInput) => apiClient.put<StockItem>(
    `/api/itens/${itemId}`,
    input,
    organizationRequest,
  ),
  inactivate: (itemId: number) => apiClient.delete<void>(`/api/itens/${itemId}`, organizationRequest),
  entry: (itemId: number, input: StockMovementInput) => apiClient.post<StockMovement>(
    `/api/itens/${itemId}/entrada`,
    input,
    organizationRequest,
  ),
  exit: (itemId: number, input: StockMovementInput) => apiClient.post<StockMovement>(
    `/api/itens/${itemId}/saida`,
    input,
    organizationRequest,
  ),
  correct: (itemId: number, input: StockMovementInput) => apiClient.post<StockMovement>(
    `/api/itens/${itemId}/correcao`,
    input,
    organizationRequest,
  ),
}
