import type { MemberProfile, StockItem, StockMovement } from '../types/api'

export type InventoryFilter = 'active' | 'low' | 'normal' | 'empty' | 'inactive'
export type InventoryStatus = 'normal' | 'low' | 'empty' | 'inactive'
export type InventoryAction = 'create' | 'edit' | 'entry' | 'exit' | 'correction' | 'inactivate'

export const inventoryFilterLabels: Record<InventoryFilter, string> = {
  active: 'Ativos',
  low: 'Abaixo do mínimo',
  normal: 'Estoque normal',
  empty: 'Sem estoque',
  inactive: 'Inativos',
}

export function normalizeInventorySearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function inventoryStatus(item: StockItem, officialLowStockIds: ReadonlySet<number>): InventoryStatus {
  if (!item.ativo) return 'inactive'
  if (item.quantidadeAtual === 0) return 'empty'
  if (officialLowStockIds.has(item.id)) return 'low'
  return 'normal'
}

export function inventoryStatusLabel(status: InventoryStatus): string {
  return {
    normal: 'Normal',
    low: 'Abaixo do mínimo',
    empty: 'Sem estoque',
    inactive: 'Inativo',
  }[status]
}

export function filterInventory(
  items: StockItem[],
  filter: InventoryFilter,
  search: string,
  officialLowStockIds: ReadonlySet<number>,
): StockItem[] {
  const term = normalizeInventorySearch(search)
  return items.filter((item) => {
    const status = inventoryStatus(item, officialLowStockIds)
    const matchesFilter = filter === 'active'
      ? item.ativo
      : filter === 'low'
        ? item.ativo && officialLowStockIds.has(item.id)
        : status === filter
    if (!matchesFilter) return false
    if (!term) return true
    return normalizeInventorySearch(`${item.nome} ${item.codigo}`).includes(term)
  })
}

export function canWriteStock(profile: MemberProfile): boolean {
  return profile === 'ADMIN' || profile === 'OPERADOR'
}

export function stockMovementSentence(movement: StockMovement): string {
  const absoluteQuantity = Math.abs(movement.quantidade)
  const unit = absoluteQuantity === 1 ? 'unidade' : 'unidades'
  if (movement.tipoMovimentacao === 'ENTRADA') return `Entrada de ${absoluteQuantity} ${unit}`
  if (movement.tipoMovimentacao === 'SAIDA') return `Saída de ${absoluteQuantity} ${unit}`
  return 'Correção de estoque'
}
