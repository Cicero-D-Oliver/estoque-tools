import { apiClient } from '../lib/api-client'

export interface ActivationPreview {
  estado: 'VALIDO' | 'EXPIRADO' | 'UTILIZADO' | 'INVALIDO'
  email: string | null
  organizacao: string | null
  requerCriacaoConta: boolean
}

export const onboardingService = {
  bootstrapStatus: () => apiClient.get<{ disponivel: boolean }>('/api/onboarding/bootstrap/status', {
    skipAuthRefresh: true,
  }),
  requestBootstrap: (email: string) => apiClient.post<{ mensagem: string }>(
    '/api/onboarding/bootstrap',
    { email },
    { skipAuthRefresh: true },
  ),
  preview: (token: string) => apiClient.get<ActivationPreview>(
    `/api/onboarding/ativacao?token=${encodeURIComponent(token)}`,
    { skipAuthRefresh: true },
  ),
  complete: (input: {
    token: string
    nome?: string
    senha?: string
    confirmacaoSenha?: string
  }) => apiClient.post<{ mensagem: string }>('/api/onboarding/ativacao', input, {
    skipAuthRefresh: true,
  }),
}
