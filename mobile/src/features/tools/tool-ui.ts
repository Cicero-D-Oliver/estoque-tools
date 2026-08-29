import axios from 'axios';
import type { Account, MemberProfile, Tool, ToolMovement, ToolStatus } from '@/types/api';
import type { ToolAction } from '@/services/tool-service';

export type ToolFilter =
  | 'active'
  | 'available'
  | 'borrowed'
  | 'maintenance'
  | 'lost'
  | 'inactive'
  | 'mine';

export const filterLabels: Record<ToolFilter, string> = {
  active: 'Ativas',
  available: 'Disponíveis',
  borrowed: 'Em uso',
  maintenance: 'Manutenção',
  lost: 'Perdidas',
  inactive: 'Inativas',
  mine: 'Comigo',
};

export const actionLabels: Record<ToolAction, string> = {
  create: 'Nova ferramenta',
  edit: 'Editar',
  withdraw: 'Retirar',
  return: 'Devolver',
  transfer: 'Transferir',
  maintenance: 'Enviar para manutenção',
  'complete-maintenance': 'Concluir manutenção',
  loss: 'Registrar perda',
  correction: 'Corrigir estado',
  inactivate: 'Inativar',
};

export const successMessages: Record<ToolAction, string> = {
  create: 'Ferramenta cadastrada.',
  edit: 'Ferramenta atualizada.',
  withdraw: 'Retirada registrada.',
  return: 'Devolução registrada.',
  transfer: 'Transferência registrada.',
  maintenance: 'Manutenção registrada.',
  'complete-maintenance': 'Ferramenta disponível novamente.',
  loss: 'Perda registrada.',
  correction: 'Estado corrigido.',
  inactivate: 'Ferramenta inativada.',
};

export function normalizeToolSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function filterTools(
  tools: Tool[],
  filter: ToolFilter,
  search: string,
  accountId?: number,
): Tool[] {
  const term = normalizeToolSearch(search);
  return tools.filter((tool) => {
    const matchesSearch = !term
      || normalizeToolSearch(tool.nome).includes(term)
      || normalizeToolSearch(tool.patrimonio).includes(term);
    if (!matchesSearch) return false;

    switch (filter) {
      case 'active': return tool.ativo;
      case 'available': return tool.ativo && tool.status === 'DISPONIVEL';
      case 'borrowed': return tool.ativo && tool.status === 'EMPRESTADA';
      case 'maintenance': return tool.ativo && tool.status === 'MANUTENCAO';
      case 'lost': return tool.ativo && tool.status === 'PERDIDA';
      case 'inactive': return !tool.ativo;
      case 'mine': return tool.ativo
        && tool.status === 'EMPRESTADA'
        && tool.responsavelAtualId === accountId;
    }
  });
}

export function toolStatusLabel(tool: Tool): string {
  if (!tool.ativo) return 'Inativa';
  const labels: Record<ToolStatus, string> = {
    DISPONIVEL: 'Disponível',
    EMPRESTADA: 'Em uso',
    MANUTENCAO: 'Manutenção',
    PERDIDA: 'Perdida',
  };
  return labels[tool.status];
}

export function toolStatusColor(tool: Tool): string {
  if (!tool.ativo) return '#64748B';
  const colors: Record<ToolStatus, string> = {
    DISPONIVEL: '#277A47',
    EMPRESTADA: '#1559A6',
    MANUTENCAO: '#9A5B00',
    PERDIDA: '#B42318',
  };
  return colors[tool.status];
}

export function toolCurrentLocation(tool: Tool): string {
  if (!tool.ativo) return '—';
  if (tool.status === 'EMPRESTADA') return tool.destinoAtual || 'Destino não informado';
  if (tool.status === 'DISPONIVEL') return tool.localizacao || '—';
  return '—';
}

export function formatLocalDateTime(value: string | null, now = new Date()): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dayKey = (candidate: Date) => [
    candidate.getFullYear(), candidate.getMonth(), candidate.getDate(),
  ].join('-');
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  }).format(date);
  if (dayKey(date) === dayKey(now)) return `Hoje, ${time}`;
  if (dayKey(date) === dayKey(yesterday)) return `Ontem, ${time}`;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function canOperate(profile: MemberProfile): boolean {
  return profile === 'ADMIN' || profile === 'OPERADOR';
}

export function canTransfer(profile: MemberProfile, account: Account | null, tool: Tool): boolean {
  if (!tool.ativo || tool.status !== 'EMPRESTADA') return false;
  return profile === 'ADMIN'
    || (profile === 'OPERADOR' && tool.responsavelAtualId === account?.id);
}

export function primaryToolAction(tool: Tool, profile: MemberProfile): ToolAction | null {
  if (!tool.ativo || !canOperate(profile)) return null;
  if (tool.status === 'DISPONIVEL') return 'withdraw';
  if (tool.status === 'EMPRESTADA') return 'return';
  if (tool.status === 'MANUTENCAO') return 'complete-maintenance';
  return null;
}

export function operationalToolActions(
  tool: Tool,
  profile: MemberProfile,
  account: Account | null,
): ToolAction[] {
  if (!tool.ativo || !canOperate(profile)) return [];
  const actions: ToolAction[] = [];
  const primary = primaryToolAction(tool, profile);
  if (primary) actions.push(primary);
  if (tool.status === 'EMPRESTADA' && canTransfer(profile, account, tool)) actions.push('transfer');
  if (tool.status === 'DISPONIVEL' || tool.status === 'EMPRESTADA') actions.push('maintenance');
  if (tool.status !== 'PERDIDA') actions.push('loss');
  return actions;
}

export function administrativeToolActions(tool: Tool, profile: MemberProfile): ToolAction[] {
  if (profile !== 'ADMIN') return [];
  const actions: ToolAction[] = ['edit'];
  if (tool.ativo && tool.status !== 'EMPRESTADA') actions.push('inactivate');
  if (tool.ativo) actions.push('correction');
  return actions;
}

export const movementLabels: Record<ToolMovement['tipoMovimentacao'], string> = {
  RETIRADA: 'Retirada',
  DEVOLUCAO: 'Devolução',
  TRANSFERENCIA: 'Transferência',
  MANUTENCAO: 'Manutenção',
  CONCLUSAO_MANUTENCAO: 'Manutenção concluída',
  PERDA: 'Perda',
  CORRECAO: 'Correção',
};

export function movementSummary(movement: ToolMovement): string {
  if (movement.tipoMovimentacao === 'TRANSFERENCIA' && movement.responsavelUsuarioNome) {
    return `Para ${movement.responsavelUsuarioNome}`;
  }
  if (movement.tipoMovimentacao === 'RETIRADA' && movement.responsavelUsuarioNome) {
    return `Com ${movement.responsavelUsuarioNome}`;
  }
  return movementLabels[movement.tipoMovimentacao];
}

export function toolRequestErrorMessage(error: unknown, action?: ToolAction): string {
  if (!axios.isAxiosError(error)) return 'Não foi possível concluir.';
  if (!error.response) return 'Sem conexão com o servidor.';
  if (error.response.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (error.response.status === 403) return 'Você não pode realizar esta ação.';
  if (error.response.status === 409) return 'A ferramenta mudou de estado. Atualize os dados.';
  if (action === 'withdraw') return 'A ferramenta não está disponível para retirada.';
  if (action === 'return' || action === 'transfer') return 'A ferramenta não está em uso.';
  return 'Não foi possível concluir.';
}
