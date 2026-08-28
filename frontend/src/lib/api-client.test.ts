import { apiClient } from './api-client'
import { organizationStore } from './organization-store'
import { sessionStore } from './session-store'
import { jsonResponse, sessionFixture } from '../test/fixtures'

describe('apiClient', () => {
  it('envia Bearer e X-Organization-Id somente em chamada contextual', async () => {
    sessionStore.set(sessionFixture)
    organizationStore.set(42)
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.get('/api/ferramentas', { organization: true })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer access-token-for-test')
    expect(headers.get('X-Organization-Id')).toBe('42')
    expect(init.credentials).toBe('include')
  })

  it('transforma 403 sanitizado em erro de permissão', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      status: 403,
      codigo: 'ACESSO_NEGADO',
      mensagem: 'Acesso negado',
    }, 403)))

    await expect(apiClient.get('/api/restrito')).rejects.toMatchObject({
      status: 403,
      code: 'ACESSO_NEGADO',
      message: 'Acesso negado',
    })
  })

  it('tenta refresh uma única vez e limpa sessão quando ela expirou', async () => {
    sessionStore.set(sessionFixture)
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ status: 401, codigo: 'SESSAO_INVALIDA' }, 401))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/api/ferramentas')).rejects.toEqual(
      expect.objectContaining({ status: 401, code: 'SESSAO_EXPIRADA' }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/auth/refresh')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    })
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined()
    expect(sessionStore.get()).toBeNull()
  })

  it('rotaciona a sessão e repete a chamada original após refresh válido', async () => {
    sessionStore.set(sessionFixture)
    const rotated = { ...sessionFixture, accessToken: 'rotated-access' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: 401 }, 401))
      .mockResolvedValueOnce(jsonResponse(rotated))
      .mockResolvedValueOnce(jsonResponse([{ id: 1 }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/api/ferramentas')).resolves.toEqual([{ id: 1 }])
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Headers
    expect(retryHeaders.get('Authorization')).toBe('Bearer rotated-access')
    expect(sessionStore.get()?.accessToken).toBe('rotated-access')
  })

  it('compartilha uma única rotação entre requisições que recebem 401 juntas', async () => {
    sessionStore.set(sessionFixture)
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1
        await Promise.resolve()
        return jsonResponse({ ...sessionFixture, accessToken: 'shared-access' })
      }
      const headers = init?.headers as Headers
      return headers.get('Authorization') === 'Bearer shared-access'
        ? jsonResponse({ ok: true })
        : jsonResponse({ status: 401 }, 401)
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(Promise.all([
      apiClient.get('/api/ferramentas'),
      apiClient.get('/api/itens'),
    ])).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(refreshCalls).toBe(1)
  })
})
