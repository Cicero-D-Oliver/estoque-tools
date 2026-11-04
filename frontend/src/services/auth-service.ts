import { apiClient, restoreSession } from '../lib/api-client'
import type { AccessTokenResponse, Account } from '../types/api'

export interface LoginInput {
  email: string
  senha: string
}

export const authService = {
  login: (input: LoginInput) => apiClient.post<AccessTokenResponse>('/api/auth/login', input, {
    skipAuthRefresh: true,
  }),
  restore: restoreSession,
  me: () => apiClient.get<Account>('/api/auth/me'),
  logout: () => apiClient.post<void>('/api/auth/logout'),
  logoutAll: () => apiClient.post<void>('/api/auth/logout-all'),
}
