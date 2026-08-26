import { apiClient } from '../lib/api-client'
import type { Organization } from '../types/api'

export const organizationService = {
  list: () => apiClient.get<Organization[]>('/api/organizacoes'),
  create: (nome: string) => apiClient.post<Organization>('/api/organizacoes', { nome }),
}
