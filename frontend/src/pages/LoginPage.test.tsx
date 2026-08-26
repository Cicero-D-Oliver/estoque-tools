import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { renderWithProviders } from '../test/render'
import { accountFixture, jsonResponse, sessionFixture } from '../test/fixtures'

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/organizacoes" element={<h1>Escolha uma organização</h1>} />
    </Routes>,
    ['/login'],
  )
}

describe('LoginPage', () => {
  it('renderiza o formulário com labels acessíveis', () => {
    renderLogin()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.queryByText('Acesso seguro', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText('Bem-vindo de volta')).not.toBeInTheDocument()
    expect(screen.queryByText('Entre para acessar o ambiente da sua organização.')).not.toBeInTheDocument()
    expect(screen.queryByText('Ainda não possui uma conta?', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText('Seu estoque organizado.', { exact: false })).not.toBeInTheDocument()
  })

  it('valida campos obrigatórios sem chamar a API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('autentica, consulta /me e segue para organizações', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
      if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
      if (url.endsWith('/api/organizacoes')) return jsonResponse([])
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderLogin()

    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'uma-senha-segura')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: /escolha uma organização/i })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/auth/login')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/auth/me')
  })

  it('mostra erro humano e genérico para credenciais inválidas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      status: 401,
      codigo: 'CREDENCIAIS_INVALIDAS',
      mensagem: 'Credenciais inválidas',
    }, 401)))
    renderLogin()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@empresa.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-incorreta' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.'))
    expect(screen.getByRole('alert')).not.toHaveTextContent('CREDENCIAIS_INVALIDAS')
    expect(screen.getByRole('alert')).not.toHaveTextContent(/temporariamente indisponível/i)
  })

  it('diferencia indisponibilidade de rede sem expor detalhes técnicos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('socket internals') }))
    renderLogin()
    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'uma-senha-segura')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível conectar ao servidor/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/socket/i)
  })
})
