import { apiClient } from '../lib/api-client'
import type { MemberProfile, Tool, ToolMovement, ToolMovementSummary } from '../types/api'

export interface DashboardData {
  tools: Tool[]
  movements: ToolMovement[]
  summary: ToolMovementSummary | null
}

export async function loadDashboard(profile: MemberProfile): Promise<DashboardData> {
  const [tools, movements, summary] = await Promise.all([
    apiClient.get<Tool[]>('/api/ferramentas', { organization: true }),
    apiClient.get<ToolMovement[]>('/api/movimentacoes-ferramenta', { organization: true }),
    profile === 'ADMIN'
      ? apiClient.get<ToolMovementSummary>(
          '/api/movimentacoes-ferramenta/resumo?aposId=0&limite=6',
          { organization: true },
        )
      : Promise.resolve(null),
  ])

  return { tools, movements, summary }
}
