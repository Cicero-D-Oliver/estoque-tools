import type { StockMovement, ToolMovement } from '../types/api'
import { normalizedSearch } from './tool-ui'

export type MovementFilter = 'all' | 'tools' | 'stock' | 'pending' | 'confirmed'

export interface UnifiedMovement {
  key: string
  id: number
  source: 'tool' | 'stock'
  occurredAt: string
  typeLabel: string
  sentence: string
  subjectName: string
  subjectCode: string | null
  executor: string
  operationalResult: string
  responsible: string | null
  previousResponsible: string | null
  destination: string | null
  observation: string | null
  reviewStatus: 'PENDENTE' | 'CONFIRMADA' | null
  confirmedBy: string | null
  confirmedAt: string | null
}

export const movementFilterLabels: Record<MovementFilter, string> = {
  all: 'Todos',
  tools: 'Ferramentas',
  stock: 'Estoque',
  pending: 'Pendentes',
  confirmed: 'Confirmados',
}

const toolTypeLabels: Record<ToolMovement['tipoMovimentacao'], string> = {
  RETIRADA: 'Retirada',
  DEVOLUCAO: 'Devolução',
  TRANSFERENCIA: 'Transferência',
  MANUTENCAO: 'Manutenção',
  CONCLUSAO_MANUTENCAO: 'Manutenção concluída',
  PERDA: 'Perda',
  CORRECAO: 'Correção',
}

function toolSentence(movement: ToolMovement): string {
  const tool = movement.ferramentaNome
  switch (movement.tipoMovimentacao) {
    case 'RETIRADA': return `${movement.usuarioNome} retirou ${tool}`
    case 'DEVOLUCAO': return `${movement.usuarioNome} devolveu ${tool}`
    case 'TRANSFERENCIA': return movement.responsavelUsuarioNome
      ? `${tool} foi transferida para ${movement.responsavelUsuarioNome}`
      : `${movement.usuarioNome} transferiu ${tool}`
    case 'MANUTENCAO': return `${movement.usuarioNome} enviou ${tool} para manutenção`
    case 'CONCLUSAO_MANUTENCAO': return `${movement.usuarioNome} concluiu a manutenção de ${tool}`
    case 'PERDA': return `${movement.usuarioNome} registrou a perda de ${tool}`
    case 'CORRECAO': return `${movement.usuarioNome} corrigiu o estado de ${tool}`
  }
}

function stockTypeLabel(movement: StockMovement): string {
  if (movement.tipoMovimentacao === 'ENTRADA') return 'Entrada'
  if (movement.tipoMovimentacao === 'SAIDA') return 'Saída'
  return 'Correção'
}

function stockResult(movement: StockMovement): string {
  const quantity = Math.abs(movement.quantidade)
  const unit = quantity === 1 ? 'unidade' : 'unidades'
  if (movement.tipoMovimentacao === 'CORRECAO') return `Novo saldo: ${quantity} ${unit}`
  return `${quantity} ${unit}`
}

function stockSentence(movement: StockMovement): string {
  const result = stockResult(movement)
  if (movement.tipoMovimentacao === 'ENTRADA') return `Entrada de ${result} de ${movement.itemEstoqueNome}`
  if (movement.tipoMovimentacao === 'SAIDA') return `Saída de ${result} de ${movement.itemEstoqueNome}`
  return `Estoque de ${movement.itemEstoqueNome} corrigido para ${result.replace('Novo saldo: ', '')}`
}

export function combineMovements(
  toolMovements: ToolMovement[],
  stockMovements: StockMovement[],
): UnifiedMovement[] {
  const tools: UnifiedMovement[] = toolMovements.map((movement) => ({
    key: `tool-${movement.id}`,
    id: movement.id,
    source: 'tool',
    occurredAt: movement.dataHora,
    typeLabel: toolTypeLabels[movement.tipoMovimentacao],
    sentence: toolSentence(movement),
    subjectName: movement.ferramentaNome,
    subjectCode: movement.ferramentaPatrimonio,
    executor: movement.usuarioNome,
    operationalResult: movement.responsavelUsuarioNome ?? movementTypeLabelsFallback(movement),
    responsible: movement.responsavelUsuarioNome,
    previousResponsible: movement.responsavelAnteriorUsuarioNome,
    destination: movement.destino,
    observation: movement.observacao,
    reviewStatus: movement.statusRevisao,
    confirmedBy: movement.confirmadoPorUsuarioNome,
    confirmedAt: movement.confirmadoEm,
  }))
  const stock: UnifiedMovement[] = stockMovements.map((movement) => ({
    key: `stock-${movement.id}`,
    id: movement.id,
    source: 'stock',
    occurredAt: movement.dataHora,
    typeLabel: stockTypeLabel(movement),
    sentence: stockSentence(movement),
    subjectName: movement.itemEstoqueNome,
    subjectCode: null,
    executor: movement.usuarioNome,
    operationalResult: stockResult(movement),
    responsible: null,
    previousResponsible: null,
    destination: null,
    observation: movement.observacao,
    reviewStatus: null,
    confirmedBy: null,
    confirmedAt: null,
  }))
  return [...tools, ...stock].sort((left, right) => (
    new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  ))
}

function movementTypeLabelsFallback(movement: ToolMovement): string {
  if (movement.tipoMovimentacao === 'DEVOLUCAO') return 'Devolvida ao almoxarifado'
  if (movement.tipoMovimentacao === 'MANUTENCAO') return 'Em manutenção'
  if (movement.tipoMovimentacao === 'CONCLUSAO_MANUTENCAO') return 'Disponível'
  if (movement.tipoMovimentacao === 'PERDA') return 'Perda registrada'
  if (movement.tipoMovimentacao === 'CORRECAO') return 'Estado corrigido'
  return 'Responsável não informado'
}

export function filterMovements(
  movements: UnifiedMovement[],
  filter: MovementFilter,
  search: string,
): UnifiedMovement[] {
  const term = normalizedSearch(search)
  return movements.filter((movement) => {
    const matchesFilter = filter === 'all'
      ? true
      : filter === 'tools'
        ? movement.source === 'tool'
        : filter === 'stock'
          ? movement.source === 'stock'
          : movement.reviewStatus === (filter === 'pending' ? 'PENDENTE' : 'CONFIRMADA')
    if (!matchesFilter) return false
    if (!term) return true
    const haystack = normalizedSearch([
      movement.sentence,
      movement.subjectName,
      movement.subjectCode,
      movement.executor,
      movement.responsible,
      movement.destination,
      movement.observation,
    ].filter(Boolean).join(' '))
    return term.split(/\s+/).every((part) => haystack.includes(part))
  })
}
