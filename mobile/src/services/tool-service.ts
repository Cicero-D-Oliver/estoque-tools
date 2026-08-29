import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  Tool,
  ToolMovement,
  ToolStatus,
  TransferResponsible,
} from '@/types/api';

export interface ToolFormInput {
  patrimonio: string;
  nome: string;
  categoria?: string;
  localizacao?: string;
}

export interface ToolMovementInput {
  observacao?: string;
  destino?: string;
  novoResponsavelUsuarioId?: number;
  novoStatus?: Exclude<ToolStatus, 'EMPRESTADA'>;
}

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
  | 'inactivate';

export const toolKeys = {
  root: (organizationId: number) => ['organization', organizationId, 'tools'] as const,
  list: (organizationId: number) => ['organization', organizationId, 'tools', 'list'] as const,
  detail: (organizationId: number, toolId: number) => (
    ['organization', organizationId, 'tools', 'detail', toolId] as const
  ),
  history: (organizationId: number, toolId: number) => (
    ['organization', organizationId, 'tools', 'history', toolId] as const
  ),
  transferResponsibles: (organizationId: number) => (
    ['organization', organizationId, 'tools', 'transfer-responsibles'] as const
  ),
};

const organizationRequest = { organization: true } as const;

export const toolService = {
  list: async (): Promise<Tool[]> => (
    await apiClient.get<Tool[]>('/api/ferramentas', organizationRequest)
  ).data,
  get: async (toolId: number): Promise<Tool> => (
    await apiClient.get<Tool>(`/api/ferramentas/${toolId}`, organizationRequest)
  ).data,
  history: async (toolId: number): Promise<ToolMovement[]> => (
    await apiClient.get<ToolMovement[]>(`/api/ferramentas/${toolId}/historico`, organizationRequest)
  ).data,
  transferResponsibles: async (): Promise<TransferResponsible[]> => (
    await apiClient.get<TransferResponsible[]>(
      '/api/ferramentas/responsaveis-transferencia',
      organizationRequest,
    )
  ).data,
  create: async (input: ToolFormInput): Promise<Tool> => (
    await apiClient.post<Tool>('/api/ferramentas', input, organizationRequest)
  ).data,
  update: async (toolId: number, input: ToolFormInput): Promise<Tool> => (
    await apiClient.put<Tool>(`/api/ferramentas/${toolId}`, input, organizationRequest)
  ).data,
  inactivate: async (toolId: number): Promise<void> => {
    await apiClient.delete(`/api/ferramentas/${toolId}`, organizationRequest);
  },
  withdraw: async (toolId: number, input: ToolMovementInput): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(`/api/ferramentas/${toolId}/retirada`, input, organizationRequest)
  ).data,
  returnTool: async (toolId: number, input: ToolMovementInput): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(`/api/ferramentas/${toolId}/devolucao`, input, organizationRequest)
  ).data,
  transfer: async (toolId: number, input: ToolMovementInput): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(`/api/ferramentas/${toolId}/transferencia`, input, organizationRequest)
  ).data,
  sendToMaintenance: async (toolId: number, input: ToolMovementInput): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(`/api/ferramentas/${toolId}/manutencao`, input, organizationRequest)
  ).data,
  completeMaintenance: async (toolId: number, input: ToolMovementInput): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(
      `/api/ferramentas/${toolId}/conclusao-manutencao`,
      input,
      organizationRequest,
    )
  ).data,
  reportLoss: async (toolId: number, input: ToolMovementInput): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(`/api/ferramentas/${toolId}/perda`, input, organizationRequest)
  ).data,
  correctState: async (toolId: number, input: ToolMovementInput): Promise<ToolMovement> => (
    await apiClient.post<ToolMovement>(`/api/ferramentas/${toolId}/correcao`, input, organizationRequest)
  ).data,
};

export interface ExecuteToolActionRequest {
  action: ToolAction;
  tool: Tool | null;
  form?: ToolFormInput;
  movement?: ToolMovementInput;
}

export interface ToolActionPayload {
  form?: ToolFormInput;
  movement?: ToolMovementInput;
}

export async function executeToolAction({
  action,
  tool,
  form,
  movement = {},
}: ExecuteToolActionRequest): Promise<Tool | ToolMovement | void> {
  if (action === 'create') {
    if (!form) throw new Error('Dados da ferramenta não informados.');
    return toolService.create(form);
  }
  if (!tool) throw new Error('Ferramenta não selecionada.');

  switch (action) {
    case 'edit':
      if (!form) throw new Error('Dados da ferramenta não informados.');
      return toolService.update(tool.id, form);
    case 'withdraw': return toolService.withdraw(tool.id, movement);
    case 'return': return toolService.returnTool(tool.id, movement);
    case 'transfer': return toolService.transfer(tool.id, movement);
    case 'maintenance': return toolService.sendToMaintenance(tool.id, movement);
    case 'complete-maintenance': return toolService.completeMaintenance(tool.id, movement);
    case 'loss': return toolService.reportLoss(tool.id, movement);
    case 'correction': return toolService.correctState(tool.id, movement);
    case 'inactivate': return toolService.inactivate(tool.id);
  }
}

export async function invalidateToolCaches(
  queryClient: QueryClient,
  organizationId: number,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
}
