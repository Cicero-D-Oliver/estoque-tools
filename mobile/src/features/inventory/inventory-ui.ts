import axios from 'axios';
import type { MemberProfile, StockItem, StockMovement } from '@/types/api';
import type { InventoryAction } from '@/services/inventory-service';

export type InventoryFilter = 'active' | 'low' | 'normal' | 'empty' | 'inactive';
export type InventoryStatus = 'normal' | 'low' | 'empty' | 'inactive';

export const inventoryFilterLabels: Record<InventoryFilter, string> = {
  active: 'Ativos',
  low: 'Abaixo do mínimo',
  normal: 'Estoque normal',
  empty: 'Sem estoque',
  inactive: 'Inativos',
};

export const inventoryActionLabels: Record<InventoryAction, string> = {
  create: 'Novo item',
  edit: 'Editar item',
  entry: 'Entrada de estoque',
  exit: 'Saída de estoque',
  correction: 'Corrigir estoque',
  inactivate: 'Inativar item',
};

export const inventorySuccessMessages: Record<InventoryAction, string> = {
  create: 'Item cadastrado.',
  edit: 'Item atualizado.',
  entry: 'Entrada registrada.',
  exit: 'Saída registrada.',
  correction: 'Estoque corrigido.',
  inactivate: 'Item inativado.',
};

export function normalizeInventorySearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function inventoryStatus(
  item: StockItem,
  officialLowStockIds: ReadonlySet<number>,
): InventoryStatus {
  if (!item.ativo) return 'inactive';
  if (item.quantidadeAtual === 0) return 'empty';
  if (officialLowStockIds.has(item.id)) return 'low';
  return 'normal';
}

export const inventoryStatusLabels: Record<InventoryStatus, string> = {
  normal: 'Normal',
  low: 'Abaixo do mínimo',
  empty: 'Sem estoque',
  inactive: 'Inativo',
};

export const inventoryStatusColors: Record<InventoryStatus, string> = {
  normal: '#277A47',
  low: '#9A5B00',
  empty: '#B42318',
  inactive: '#64748B',
};

export function filterInventory(
  items: StockItem[],
  filter: InventoryFilter,
  search: string,
  officialLowStockIds: ReadonlySet<number>,
): StockItem[] {
  const term = normalizeInventorySearch(search);
  return items.filter((item) => {
    const status = inventoryStatus(item, officialLowStockIds);
    const matchesFilter = filter === 'active'
      ? item.ativo
      : filter === 'low'
        ? item.ativo && officialLowStockIds.has(item.id)
        : status === filter;
    if (!matchesFilter) return false;
    return !term || normalizeInventorySearch(`${item.nome} ${item.codigo}`).includes(term);
  });
}

export function canWriteInventory(profile: MemberProfile): boolean {
  return profile === 'ADMIN' || profile === 'OPERADOR';
}

export function primaryInventoryAction(
  item: StockItem,
  profile: MemberProfile,
): InventoryAction | null {
  if (!item.ativo || !canWriteInventory(profile)) return null;
  return item.quantidadeAtual > 0 ? 'exit' : 'entry';
}

export function stockMovementSentence(movement: StockMovement): string {
  const quantity = Math.abs(movement.quantidade);
  const unit = quantity === 1 ? 'unidade' : 'unidades';
  if (movement.tipoMovimentacao === 'ENTRADA') return `Entrada de ${quantity} ${unit}`;
  if (movement.tipoMovimentacao === 'SAIDA') return `Saída de ${quantity} ${unit}`;
  return 'Correção de estoque';
}

export function inventoryRequestError(error: unknown, action?: InventoryAction): string {
  if (!axios.isAxiosError(error)) return 'Não foi possível concluir.';
  if (!error.response) return 'Sem conexão com o servidor.';
  if (error.response.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (error.response.status === 403) return 'Você não pode realizar esta ação.';
  if (error.response.status === 409) return 'Este item foi alterado. Atualize os dados.';
  const payload = error.response.data as { codigo?: string; mensagem?: string; campos?: Record<string, string> };
  if (action === 'exit' && (payload?.codigo === 'REGRA_NEGOCIO' || /insuficiente/i.test(payload?.mensagem ?? ''))) {
    return 'Estoque insuficiente.';
  }
  if (payload?.campos?.quantidade) return payload.campos.quantidade;
  return 'Não foi possível concluir.';
}
