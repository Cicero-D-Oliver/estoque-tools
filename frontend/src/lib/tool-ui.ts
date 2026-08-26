import type { Account, MemberProfile, Tool, ToolMovement } from '../types/api'

export type ToolFilter = 'active' | 'available' | 'borrowed' | 'maintenance' | 'lost' | 'inactive' | 'mine'

export type ToolAction =
  | 'create'
  | 'edit'
  | 'withdraw'
  | 'return'
  | 'transfer'
  | 'maintenance'
  | 'complete-maintenance'
  | 'loss'
  | 'correction'
  | 'inactivate'

export const filterLabels: Record<ToolFilter, string> = {
  active: 'Ativas',
  available: 'Disponíveis',
  borrowed: 'Em uso',
  maintenance: 'Manutenção',
  lost: 'Perdidas',
  inactive: 'Inativas',
  mine: 'Comigo',
}

export function normalizedSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function filterTools(
  tools: Tool[],
  filter: ToolFilter,
  search: string,
  accountId?: number,
): Tool[] {
  const term = normalizedSearch(search)
  return tools.filter((tool) => {
    const matchesSearch = !term
      || normalizedSearch(tool.nome).includes(term)
      || normalizedSearch(tool.patrimonio).includes(term)
    if (!matchesSearch) return false

    switch (filter) {
      case 'active': return tool.ativo
      case 'available': return tool.ativo && tool.status === 'DISPONIVEL'
      case 'borrowed': return tool.ativo && tool.status === 'EMPRESTADA'
      case 'maintenance': return tool.ativo && tool.status === 'MANUTENCAO'
      case 'lost': return tool.ativo && tool.status === 'PERDIDA'
      case 'inactive': return !tool.ativo
      case 'mine': return tool.ativo
        && tool.status === 'EMPRESTADA'
        && tool.responsavelAtualId === accountId
    }
  })
}

export function toolStatusLabel(tool: Tool): string {
  if (!tool.ativo) return 'Inativa'
  const labels = {
    DISPONIVEL: 'Disponível',
    EMPRESTADA: 'Em uso',
    MANUTENCAO: 'Manutenção',
    PERDIDA: 'Perdida',
  }
  return labels[tool.status]
}

export function toolStatusTone(tool: Tool): string {
  if (!tool.ativo) return 'inactive'
  const tones = {
    DISPONIVEL: 'available',
    EMPRESTADA: 'borrowed',
    MANUTENCAO: 'maintenance',
    PERDIDA: 'lost',
  }
  return tones[tool.status]
}

export function toolCurrentLocation(tool: Tool): string {
  if (!tool.ativo) return '—'
  if (tool.status === 'EMPRESTADA') return tool.destinoAtual || 'Destino não informado'
  if (tool.status === 'DISPONIVEL') {
    return tool.localizacao ? `No almoxarifado · ${tool.localizacao}` : 'Local não informado'
  }
  return '—'
}

export function canOperate(profile: MemberProfile): boolean {
  return profile === 'ADMIN' || profile === 'OPERADOR'
}

export function canTransfer(profile: MemberProfile, account: Account | null, tool: Tool): boolean {
  if (!tool.ativo || tool.status !== 'EMPRESTADA') return false
  return profile === 'ADMIN'
    || (profile === 'OPERADOR' && tool.responsavelAtualId === account?.id)
}

export function primaryToolAction(tool: Tool, profile: MemberProfile): ToolAction | null {
  if (!tool.ativo || !canOperate(profile)) return null
  if (tool.status === 'DISPONIVEL') return 'withdraw'
  if (tool.status === 'EMPRESTADA') return 'return'
  if (tool.status === 'MANUTENCAO') return 'complete-maintenance'
  return null
}

export const movementLabels: Record<ToolMovement['tipoMovimentacao'], string> = {
  RETIRADA: 'Retirada',
  DEVOLUCAO: 'Devolução',
  TRANSFERENCIA: 'Transferência',
  MANUTENCAO: 'Envio para manutenção',
  CONCLUSAO_MANUTENCAO: 'Manutenção concluída',
  PERDA: 'Perda registrada',
  CORRECAO: 'Correção de estado',
}

export function movementSentence(movement: ToolMovement): string {
  switch (movement.tipoMovimentacao) {
    case 'RETIRADA':
      return `Retirada por ${movement.responsavelUsuarioNome ?? movement.usuarioNome}`
    case 'DEVOLUCAO':
      return 'Devolvida ao almoxarifado'
    case 'TRANSFERENCIA':
      return movement.responsavelUsuarioNome
        ? `Transferida para ${movement.responsavelUsuarioNome}`
        : 'Responsabilidade transferida'
    case 'MANUTENCAO':
      return 'Enviada para manutenção'
    case 'CONCLUSAO_MANUTENCAO':
      return 'Manutenção concluída'
    case 'PERDA':
      return 'Perda registrada'
    case 'CORRECAO':
      return 'Estado corrigido'
  }
}
