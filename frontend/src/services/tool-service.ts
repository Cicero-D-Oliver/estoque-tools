import { apiClient } from '../lib/api-client'
import type {
  Tool,
  ToolMovement,
  ToolStatus,
  TransferResponsible,
} from '../types/api'

export interface ToolFormInput {
  patrimonio: string
  nome: string
  categoria?: string
  localizacao?: string
}

export interface ToolMovementInput {
  observacao?: string
  destino?: string
  novoResponsavelUsuarioId?: number
  novoStatus?: Exclude<ToolStatus, 'EMPRESTADA'>
}

export const toolKeys = {
  all: ['tools'] as const,
  list: (organizationId: number) => ['tools', organizationId, 'list'] as const,
  detail: (organizationId: number, toolId: number) => ['tools', organizationId, 'detail', toolId] as const,
  history: (organizationId: number, toolId: number) => ['tools', organizationId, 'history', toolId] as const,
  transferResponsibles: (organizationId: number) => ['tools', organizationId, 'transfer-responsibles'] as const,
}

const organizationRequest = { organization: true } as const

export const toolService = {
  list: () => apiClient.get<Tool[]>('/api/ferramentas', organizationRequest),
  get: (toolId: number) => apiClient.get<Tool>(`/api/ferramentas/${toolId}`, organizationRequest),
  history: (toolId: number) => apiClient.get<ToolMovement[]>(
    `/api/ferramentas/${toolId}/historico`,
    organizationRequest,
  ),
  transferResponsibles: () => apiClient.get<TransferResponsible[]>(
    '/api/ferramentas/responsaveis-transferencia',
    organizationRequest,
  ),
  create: (input: ToolFormInput) => apiClient.post<Tool>('/api/ferramentas', input, organizationRequest),
  update: (toolId: number, input: ToolFormInput) => apiClient.put<Tool>(
    `/api/ferramentas/${toolId}`,
    input,
    organizationRequest,
  ),
  inactivate: (toolId: number) => apiClient.delete<void>(`/api/ferramentas/${toolId}`, organizationRequest),
  withdraw: (toolId: number, input: ToolMovementInput) => apiClient.post<ToolMovement>(
    `/api/ferramentas/${toolId}/retirada`,
    input,
    organizationRequest,
  ),
  returnTool: (toolId: number, input: ToolMovementInput) => apiClient.post<ToolMovement>(
    `/api/ferramentas/${toolId}/devolucao`,
    input,
    organizationRequest,
  ),
  transfer: (toolId: number, input: ToolMovementInput) => apiClient.post<ToolMovement>(
    `/api/ferramentas/${toolId}/transferencia`,
    input,
    organizationRequest,
  ),
  sendToMaintenance: (toolId: number, input: ToolMovementInput) => apiClient.post<ToolMovement>(
    `/api/ferramentas/${toolId}/manutencao`,
    input,
    organizationRequest,
  ),
  completeMaintenance: (toolId: number, input: ToolMovementInput) => apiClient.post<ToolMovement>(
    `/api/ferramentas/${toolId}/conclusao-manutencao`,
    input,
    organizationRequest,
  ),
  reportLoss: (toolId: number, input: ToolMovementInput) => apiClient.post<ToolMovement>(
    `/api/ferramentas/${toolId}/perda`,
    input,
    organizationRequest,
  ),
  correctState: (toolId: number, input: ToolMovementInput) => apiClient.post<ToolMovement>(
    `/api/ferramentas/${toolId}/correcao`,
    input,
    organizationRequest,
  ),
}
