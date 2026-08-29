import { apiClient } from '@/api/client';
import type { Organization } from '@/types/api';

export const organizationService = {
  list: async (): Promise<Organization[]> => (
    await apiClient.get<Organization[]>('/api/organizacoes')
  ).data,
  create: async (nome: string): Promise<Organization> => (
    await apiClient.post<Organization>('/api/organizacoes', { nome })
  ).data,
};
