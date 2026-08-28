import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { sessionStore } from '../lib/session-store'
import { accountFixture, jsonResponse, sessionFixture } from '../test/fixtures'
import { AuthProvider, useAuth } from './AuthProvider'

function SessionProbe() {
  const { status, account, logout } = useAuth()
  return (
    <div>
      <span>{status}</span>
      {account && <span>{account.email}</span>}
      <button onClick={() => void logout()}>Sair</button>
    </div>
  )
}

function renderSession() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('sessão web persistente', () => {
  it('restaura a conta após remontar a aplicação usando somente o cookie HttpOnly', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/auth/refresh')) {
        expect(init).toMatchObject({ method: 'POST', credentials: 'include' })
        expect(init?.body).toBeUndefined()
        return jsonResponse(sessionFixture)
      }
      if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const firstRender = renderSession()
    expect(await screen.findByText(accountFixture.email)).toBeInTheDocument()
    firstRender.unmount()
    sessionStore.clear()

    renderSession()
    expect(await screen.findByText(accountFixture.email)).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/api/auth/refresh'))).toHaveLength(2)
  })

  it('não usa localStorage nem sessionStorage para tokens', async () => {
    const localStorageSpy = vi.spyOn(window.localStorage, 'setItem')
    const sessionStorageSpy = vi.spyOn(window.sessionStorage, 'setItem')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => (
      String(input).endsWith('/api/auth/refresh')
        ? jsonResponse(sessionFixture)
        : jsonResponse(accountFixture)
    )))

    renderSession()
    expect(await screen.findByText(accountFixture.email)).toBeInTheDocument()
    expect(localStorageSpy).not.toHaveBeenCalled()
    expect(sessionStorageSpy).not.toHaveBeenCalled()
  })

  it('volta ao estado anônimo quando o cookie não representa sessão válida', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      codigo: 'SESSAO_INVALIDA',
      mensagem: 'Sessão inválida',
    }, 401)))

    renderSession()
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(sessionStore.get()).toBeNull()
  })

  it('encerra a sessão sem enviar refresh token no corpo', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/auth/refresh')) return jsonResponse(sessionFixture)
      if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
      if (url.endsWith('/api/auth/logout')) {
        expect(init?.credentials).toBe('include')
        expect(init?.body).toBeUndefined()
        return new Response(null, { status: 204 })
      }
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderSession()
    await screen.findByText(accountFixture.email)

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument())
    expect(sessionStore.get()).toBeNull()
  })
})
