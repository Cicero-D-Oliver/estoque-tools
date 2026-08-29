import { apiClient } from '@/api/client';
import type { MemberProfile, StockItem, Tool, ToolMovement } from '@/types/api';

export interface DashboardData {
  tools: Tool[];
  borrowedTools: Tool[];
  movements: ToolMovement[];
  pendingMovements: ToolMovement[];
  lowStockItems: StockItem[];
}

export async function loadDashboard(profile: MemberProfile): Promise<DashboardData> {
  const [tools, borrowedTools, movements, pendingMovements, lowStockItems] = await Promise.all([
    apiClient.get<Tool[]>('/api/ferramentas', { organization: true }),
    apiClient.get<Tool[]>('/api/ferramentas/emprestadas', { organization: true }),
    apiClient.get<ToolMovement[]>('/api/movimentacoes-ferramenta', { organization: true }),
    profile === 'ADMIN'
      ? apiClient.get<ToolMovement[]>('/api/movimentacoes-ferramenta/pendentes', { organization: true })
      : Promise.resolve({ data: [] as ToolMovement[] }),
    apiClient.get<StockItem[]>('/api/itens/abaixo-minimo', { organization: true }),
  ]);

  return {
    tools: tools.data,
    borrowedTools: borrowedTools.data,
    movements: movements.data,
    pendingMovements: pendingMovements.data,
    lowStockItems: lowStockItems.data,
  };
}
