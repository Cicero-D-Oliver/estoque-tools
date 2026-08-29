import { apiClient } from '@/api/client';
import type { Account, MobileSession } from '@/types/api';

export const authService = {
  login: async (email: string, senha: string): Promise<MobileSession> => {
    const response = await apiClient.post<MobileSession>(
      '/api/mobile/auth/login',
      { email, senha },
      { skipAuthRefresh: true },
    );
    return response.data;
  },
  refresh: async (refreshToken: string): Promise<MobileSession> => {
    const response = await apiClient.post<MobileSession>(
      '/api/mobile/auth/refresh',
      { refreshToken },
      { skipAuthRefresh: true },
    );
    return response.data;
  },
  me: async (): Promise<Account> => (await apiClient.get<Account>('/api/auth/me')).data,
  logout: (refreshToken: string) => apiClient.post<void>('/api/mobile/auth/logout', { refreshToken }),
};
