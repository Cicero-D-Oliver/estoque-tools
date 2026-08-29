import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StockItem, StockMovement } from '@/types/api';

export interface StockItemInput {
  codigo: string;
  nome: string;
  categoria?: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  localizacao?: string;
}

export interface StockMovementInput {
  quantidade: number;
  observacao?: string;
}

export type InventoryAction = 'create' | 'edit' | 'entry' | 'exit' | 'correction' | 'inactivate';

export interface InventoryActionPayload {
  form?: StockItemInput;
  movement?: StockMovementInput;
}

export const inventoryKeys = {
  root: (organizationId: number) => ['organization', organizationId, 'inventory'] as const,
  list: (organizationId: number) => ['organization', organizationId, 'inventory', 'list'] as const,
  detail: (organizationId: number, itemId: number) => (
    ['organization', organizationId, 'inventory', 'detail', itemId] as const
  ),
  lowStock: (organizationId: number) => (
    ['organization', organizationId, 'inventory', 'low-stock'] as const
  ),
  history: (organizationId: number, itemId: number) => (
    ['organization', organizationId, 'inventory', 'history', itemId] as const
  ),
};

const organizationRequest = { organization: true } as const;

export const inventoryService = {
  list: async (): Promise<StockItem[]> => (
    await apiClient.get<StockItem[]>('/api/itens', organizationRequest)
  ).data,
  get: async (itemId: number): Promise<StockItem> => (
    await apiClient.get<StockItem>(`/api/itens/${itemId}`, organizationRequest)
  ).data,
  lowStock: async (): Promise<StockItem[]> => (
    await apiClient.get<StockItem[]>('/api/itens/abaixo-minimo', organizationRequest)
  ).data,
  history: async (itemId: number): Promise<StockMovement[]> => (
    await apiClient.get<StockMovement[]>(`/api/itens/${itemId}/historico`, organizationRequest)
  ).data,
  create: async (input: StockItemInput): Promise<StockItem> => (
    await apiClient.post<StockItem>('/api/itens', input, organizationRequest)
  ).data,
  update: async (itemId: number, input: StockItemInput): Promise<StockItem> => (
    await apiClient.put<StockItem>(`/api/itens/${itemId}`, input, organizationRequest)
  ).data,
  inactivate: async (itemId: number): Promise<void> => {
    await apiClient.delete(`/api/itens/${itemId}`, organizationRequest);
  },
  entry: async (itemId: number, input: StockMovementInput): Promise<StockMovement> => (
    await apiClient.post<StockMovement>(`/api/itens/${itemId}/entrada`, input, organizationRequest)
  ).data,
  exit: async (itemId: number, input: StockMovementInput): Promise<StockMovement> => (
    await apiClient.post<StockMovement>(`/api/itens/${itemId}/saida`, input, organizationRequest)
  ).data,
  correct: async (itemId: number, input: StockMovementInput): Promise<StockMovement> => (
    await apiClient.post<StockMovement>(`/api/itens/${itemId}/correcao`, input, organizationRequest)
  ).data,
};

export async function executeInventoryAction(
  action: InventoryAction,
  item: StockItem | null,
  payload: InventoryActionPayload,
): Promise<StockItem | StockMovement | void> {
  if (action === 'create') {
    if (!payload.form) throw new Error('Dados do item não informados.');
    return inventoryService.create(payload.form);
  }
  if (!item) throw new Error('Item não selecionado.');
  switch (action) {
    case 'edit':
      if (!payload.form) throw new Error('Dados do item não informados.');
      return inventoryService.update(item.id, payload.form);
    case 'entry': return inventoryService.entry(item.id, payload.movement ?? { quantidade: 0 });
    case 'exit': return inventoryService.exit(item.id, payload.movement ?? { quantidade: 0 });
    case 'correction': return inventoryService.correct(item.id, payload.movement ?? { quantidade: 0 });
    case 'inactivate': return inventoryService.inactivate(item.id);
  }
}

export async function invalidateInventoryCaches(
  queryClient: QueryClient,
  organizationId: number,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
}
