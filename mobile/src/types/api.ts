export type MemberProfile = 'ADMIN' | 'OPERADOR' | 'CONSULTA';
export type MemberStatus = 'PENDENTE' | 'ATIVO' | 'REJEITADO' | 'REMOVIDO';
export type ToolStatus = 'DISPONIVEL' | 'EMPRESTADA' | 'MANUTENCAO' | 'PERDIDA';
export type ReviewStatus = 'PENDENTE' | 'CONFIRMADA';
export type StockMovementType = 'ENTRADA' | 'SAIDA' | 'CORRECAO';
export type ToolMovementType =
  | 'RETIRADA'
  | 'DEVOLUCAO'
  | 'TRANSFERENCIA'
  | 'MANUTENCAO'
  | 'CONCLUSAO_MANUTENCAO'
  | 'PERDA'
  | 'CORRECAO';

export interface Account {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  senhaAlteradaEm: string | null;
  ultimoLoginEm: string | null;
}

export interface MobileSession {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  expiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
}

export interface Organization {
  id: number;
  nome: string;
  ativa: boolean;
  criadaEm: string;
  perfil: MemberProfile;
  status: MemberStatus;
}

export interface OrganizationMember {
  id: number;
  organizacaoId: number;
  usuarioId: number;
  usuarioNome: string;
  usuarioEmail: string;
  perfil: MemberProfile;
  status: MemberStatus;
  solicitadoEm: string;
  aprovadoEm: string | null;
  aprovadoPorUsuarioId: number | null;
  removidoEm: string | null;
}

export interface Tool {
  id: number;
  patrimonio: string;
  nome: string;
  categoria: string | null;
  status: ToolStatus;
  responsavelAtualId: number | null;
  responsavelAtualNome: string | null;
  responsavelDesde: string | null;
  destinoAtual: string | null;
  localizacao: string | null;
  ativo: boolean;
}

export interface StockItem {
  id: number;
  codigo: string;
  nome: string;
  categoria: string | null;
  quantidadeAtual: number;
  quantidadeMinima: number;
  localizacao: string | null;
  ativo: boolean;
  abaixoMinimo: boolean;
}

export interface StockMovement {
  id: number;
  itemEstoqueId: number;
  itemEstoqueNome: string;
  usuarioId: number;
  usuarioNome: string;
  tipoMovimentacao: StockMovementType;
  quantidade: number;
  dataHora: string;
  observacao: string | null;
}

export interface ToolMovement {
  id: number;
  ferramentaId: number;
  ferramentaNome: string;
  ferramentaPatrimonio: string;
  usuarioId: number;
  usuarioNome: string;
  responsavelUsuarioId: number | null;
  responsavelUsuarioNome: string | null;
  responsavelAnteriorUsuarioId: number | null;
  responsavelAnteriorUsuarioNome: string | null;
  tipoMovimentacao: ToolMovementType;
  dataHora: string;
  observacao: string | null;
  destino: string | null;
  statusRevisao: ReviewStatus;
  confirmadoPorUsuarioId: number | null;
  confirmadoPorUsuarioNome: string | null;
  confirmadoEm: string | null;
}

export interface TransferResponsible {
  id: number;
  nome: string;
}

export interface ApiErrorPayload {
  status?: number;
  codigo?: string;
  mensagem?: string;
  campos?: Record<string, string>;
}
