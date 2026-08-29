import axios from 'axios';
import type { StockMovement, ToolMovement } from '@/types/api';
import { normalizeToolSearch } from '@/features/tools/tool-ui';

export type MovementFilter = 'all' | 'tools' | 'stock' | 'pending' | 'confirmed';

export interface UnifiedMovement {
  key: string;
  id: number;
  source: 'tool' | 'stock';
  occurredAt: string;
  typeLabel: string;
  sentence: string;
  subjectName: string;
  subjectCode: string | null;
  executor: string;
  operationalResult: string;
  responsible: string | null;
  previousResponsible: string | null;
  destination: string | null;
  observation: string | null;
  reviewStatus: 'PENDENTE' | 'CONFIRMADA' | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

export const movementFilterLabels: Record<MovementFilter, string> = {
  all: 'Todos',
  tools: 'Ferramentas',
  stock: 'Estoque',
  pending: 'Pendentes',
  confirmed: 'Confirmados',
};

const toolTypeLabels: Record<ToolMovement['tipoMovimentacao'], string> = {
  RETIRADA: 'Retirada',
  DEVOLUCAO: 'Devolução',
  TRANSFERENCIA: 'Transferência',
  MANUTENCAO: 'Manutenção',
  CONCLUSAO_MANUTENCAO: 'Manutenção concluída',
  PERDA: 'Perda',
  CORRECAO: 'Correção',
};

function toolSentence(movement: ToolMovement): string {
  const name = movement.ferramentaNome;
  switch (movement.tipoMovimentacao) {
    case 'RETIRADA': return `${movement.usuarioNome} retirou ${name}`;
    case 'DEVOLUCAO': return `${movement.usuarioNome} devolveu ${name}`;
    case 'TRANSFERENCIA': return movement.responsavelUsuarioNome
      ? `${name} foi transferida para ${movement.responsavelUsuarioNome}`
      : `${movement.usuarioNome} transferiu ${name}`;
    case 'MANUTENCAO': return `${movement.usuarioNome} enviou ${name} para manutenção`;
    case 'CONCLUSAO_MANUTENCAO': return `${movement.usuarioNome} concluiu a manutenção de ${name}`;
    case 'PERDA': return `${movement.usuarioNome} registrou a perda de ${name}`;
    case 'CORRECAO': return `${movement.usuarioNome} corrigiu o estado de ${name}`;
  }
}

function toolResult(movement: ToolMovement): string {
  if (movement.responsavelUsuarioNome) return movement.responsavelUsuarioNome;
  if (movement.tipoMovimentacao === 'DEVOLUCAO') return 'Devolvida ao almoxarifado';
  if (movement.tipoMovimentacao === 'MANUTENCAO') return 'Em manutenção';
  if (movement.tipoMovimentacao === 'CONCLUSAO_MANUTENCAO') return 'Disponível';
  if (movement.tipoMovimentacao === 'PERDA') return 'Perda registrada';
  if (movement.tipoMovimentacao === 'CORRECAO') return 'Estado corrigido';
  return 'Responsável não informado';
}

function stockResult(movement: StockMovement): string {
  const quantity = Math.abs(movement.quantidade);
  const unit = quantity === 1 ? 'unidade' : 'unidades';
  return movement.tipoMovimentacao === 'CORRECAO'
    ? `Novo saldo: ${quantity} ${unit}`
    : `${quantity} ${unit}`;
}

function stockSentence(movement: StockMovement): string {
  const result = stockResult(movement);
  if (movement.tipoMovimentacao === 'ENTRADA') return `Entrada de ${result} de ${movement.itemEstoqueNome}`;
  if (movement.tipoMovimentacao === 'SAIDA') return `Saída de ${result} de ${movement.itemEstoqueNome}`;
  return `Estoque de ${movement.itemEstoqueNome} corrigido para ${result.replace('Novo saldo: ', '')}`;
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
    operationalResult: toolResult(movement),
    responsible: movement.responsavelUsuarioNome,
    previousResponsible: movement.responsavelAnteriorUsuarioNome,
    destination: movement.destino,
    observation: movement.observacao,
    reviewStatus: movement.statusRevisao,
    confirmedBy: movement.confirmadoPorUsuarioNome,
    confirmedAt: movement.confirmadoEm,
  }));
  const stock: UnifiedMovement[] = stockMovements.map((movement) => ({
    key: `stock-${movement.id}`,
    id: movement.id,
    source: 'stock',
    occurredAt: movement.dataHora,
    typeLabel: movement.tipoMovimentacao === 'ENTRADA'
      ? 'Entrada'
      : movement.tipoMovimentacao === 'SAIDA' ? 'Saída' : 'Correção',
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
  }));
  return [...tools, ...stock].sort((left, right) => (
    new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
    || right.id - left.id
  ));
}

export function filterMovements(
  movements: UnifiedMovement[],
  filter: MovementFilter,
  search: string,
): UnifiedMovement[] {
  const term = normalizeToolSearch(search);
  return movements.filter((movement) => {
    const matchesFilter = filter === 'all'
      || (filter === 'tools' && movement.source === 'tool')
      || (filter === 'stock' && movement.source === 'stock')
      || (filter === 'pending' && movement.reviewStatus === 'PENDENTE')
      || (filter === 'confirmed' && movement.reviewStatus === 'CONFIRMADA');
    if (!matchesFilter) return false;
    if (!term) return true;
    const haystack = normalizeToolSearch([
      movement.sentence,
      movement.subjectName,
      movement.subjectCode,
      movement.executor,
      movement.responsible,
      movement.destination,
      movement.observation,
    ].filter(Boolean).join(' '));
    return term.split(/\s+/).every((part) => haystack.includes(part));
  });
}

export function confirmationError(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Não foi possível confirmar.';
  if (!error.response) return 'Sem conexão com o servidor.';
  if (error.response.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (error.response.status === 403) return 'Você não pode confirmar esta movimentação.';
  if (error.response.status === 409) return 'Esta movimentação já foi atualizada.';
  return 'Não foi possível confirmar.';
}
