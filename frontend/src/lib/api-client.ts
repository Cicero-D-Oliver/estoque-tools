import { organizationStore } from './organization-store'
import { sessionStore } from './session-store'
import type { AccessTokenResponse, ApiErrorPayload } from '../types/api'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const apiBaseUrl = configuredBaseUrl.replace(/\/$/, '')

interface ApiRequestOptions extends RequestInit {
  organization?: boolean
  skipAuthRefresh?: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly reference?: string
  readonly fields: Record<string, string>

  constructor(
    message: string,
    status = 0,
    code = 'NETWORK_ERROR',
    reference?: string,
    fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.reference = reference
    this.fields = fields
  }
}

let refreshInFlight: Promise<void> | null = null

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = {}
  try {
    payload = (await response.json()) as ApiErrorPayload
  } catch {
    // Respostas sem JSON continuam sanitizadas no cliente.
  }

  const fallback = response.status === 403
    ? 'Você não tem permissão para realizar esta ação.'
    : response.status === 404
      ? 'O recurso solicitado não foi encontrado.'
      : response.status === 401
        ? 'Sua sessão não é válida. Entre novamente.'
        : 'Não foi possível concluir a solicitação.'

  return new ApiError(
    payload.mensagem || fallback,
    response.status,
    payload.codigo || `HTTP_${response.status}`,
    payload.referencia,
    payload.campos,
  )
}

async function renewSession(): Promise<void> {
  const currentSession = sessionStore.get()
  if (!currentSession?.refreshToken) {
    throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'SESSAO_EXPIRADA')
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  sessionStore.set((await response.json()) as AccessTokenResponse)
}

async function ensureRenewedSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = renewSession().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
  allowRetry = true,
): Promise<T> {
  const { organization, skipAuthRefresh, headers: suppliedHeaders, ...fetchOptions } = options
  const headers = new Headers(suppliedHeaders)
  headers.set('Accept', 'application/json')

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const currentSession = sessionStore.get()
  if (currentSession?.accessToken) {
    headers.set('Authorization', `${currentSession.tokenType} ${currentSession.accessToken}`)
  }

  if (organization) {
    const organizationId = organizationStore.get()
    if (!organizationId) {
      throw new ApiError('Selecione uma organização para continuar.', 400, 'ORGANIZACAO_NAO_SELECIONADA')
    }
    headers.set('X-Organization-Id', String(organizationId))
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { ...fetchOptions, headers })

    if (response.status === 401 && allowRetry && !skipAuthRefresh && currentSession?.refreshToken) {
      try {
        await ensureRenewedSession()
        return await request<T>(path, options, false)
      } catch {
        sessionStore.clear()
        throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'SESSAO_EXPIRADA')
      }
    }

    if (!response.ok) {
      const error = await parseError(response)
      if (response.status === 401 && !skipAuthRefresh) {
        sessionStore.clear()
      }
      throw error
    }

    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua rede e tente novamente.')
  }
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => request<T>(path, {
    ...options,
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => request<T>(path, {
    ...options,
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  delete: <T>(path: string, options?: ApiRequestOptions) => request<T>(path, {
    ...options,
    method: 'DELETE',
  }),
}
