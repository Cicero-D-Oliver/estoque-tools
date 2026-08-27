export type MemberProfile = 'ADMIN' | 'OPERADOR' | 'CONSULTA'
export type MemberStatus = 'PENDENTE' | 'ATIVO' | 'REJEITADO' | 'REMOVIDO'
export type ToolStatus = 'DISPONIVEL' | 'EMPRESTADA' | 'MANUTENCAO' | 'PERDIDA'
export type ReviewStatus = 'PENDENTE' | 'CONFIRMADA'

export interface Account {
  id: number
  nome: string
  email: string
  ativo: boolean
  senhaAlteradaEm: string | null
  ultimoLoginEm: string | null
}

export interface AccessTokenResponse {
  tokenType: 'Bearer'
  accessToken: string
  expiresIn: number
  expiresAt: string
  refreshToken: string
  refreshExpiresAt: string
}

export interface Organization {
  id: number
  nome: string
  ativa: boolean
  criadaEm: string
  perfil: MemberProfile
  status: MemberStatus
}

export interface Tool {
  id: number
  patrimonio: string
  nome: string
  categoria: string | null
  status: ToolStatus
  responsavelAtualId: number | null
  responsavelAtualNome: string | null
  responsavelDesde: string | null
  destinoAtual: string | null
  localizacao: string | null
  ativo: boolean
}

export interface StockItem {
  id: number
  codigo: string
  nome: string
  categoria: string | null
  quantidadeAtual: number
  quantidadeMinima: number
  localizacao: string | null
  ativo: boolean
  abaixoMinimo: boolean
}

export interface ToolMovement {
  id: number
  ferramentaId: number
  ferramentaNome: string
  ferramentaPatrimonio: string
  usuarioId: number
  usuarioNome: string
  responsavelUsuarioId: number | null
  responsavelUsuarioNome: string | null
  responsavelAnteriorUsuarioId: number | null
  responsavelAnteriorUsuarioNome: string | null
  tipoMovimentacao:
    | 'RETIRADA'
    | 'DEVOLUCAO'
    | 'TRANSFERENCIA'
    | 'MANUTENCAO'
    | 'CONCLUSAO_MANUTENCAO'
    | 'PERDA'
    | 'CORRECAO'
  dataHora: string
  observacao: string | null
  destino: string | null
  statusRevisao: ReviewStatus
  confirmadoPorUsuarioId: number | null
  confirmadoPorUsuarioNome: string | null
  confirmadoEm: string | null
}

export interface TransferResponsible {
  id: number
  nome: string
}

export interface ToolMovementSummary {
  cursorAnterior: number
  proximoCursor: number
  quantidadeNovas: number
  quantidadeRetornada: number
  temMais: boolean
  quantidadePendentes: number
  ferramentasEmUso: number
  ferramentasEmManutencao: number
  ferramentasPerdidas: number
  movimentacoes: ToolMovement[]
}

export interface ApiErrorPayload {
  timestamp?: string
  status?: number
  codigo?: string
  erro?: string
  mensagem?: string
  caminho?: string
  referencia?: string
  campos?: Record<string, string>
}
