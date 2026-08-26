import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../test/render'
import { accountFixture, jsonResponse, sessionFixture } from '../test/fixtures'
import { RegisterPage } from './RegisterPage'

function renderRegister() {
  return renderWithProviders(
    <Routes>
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/login" element={<h1>Entrar</h1>} />
      <Route path="/organizacoes" element={<h1>Ambientes cadastrados</h1>} />
    </Routes>,
    ['/cadastro'],
  )
}

describe('RegisterPage', () => {
  it('mantém somente o formulário operacional e o retorno acessível', async () => {
    renderRegister()

    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument()
    expect(screen.getByText('12 a 72 caracteres')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar minha conta' })).toBeInTheDocument()
    expect(screen.queryByText('Acesso seguro', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByText('Crie seu acesso')).not.toBeInTheDocument()
    expect(screen.queryByText(/Comece com uma conta/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Já possui uma conta/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Voltar para o login' }))
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('preserva a alternância segura de visibilidade da senha', async () => {
    renderRegister()

    const password = screen.getByLabelText('Senha')
    await userEvent.type(password, 'senha-com-12-caracteres')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))

    expect(password).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('continua criando a conta e autenticando pelo fluxo real', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/register')) return jsonResponse(accountFixture, 201)
      if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
      if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
      if (url.endsWith('/api/organizacoes')) return jsonResponse([])
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRegister()

    await userEvent.type(screen.getByLabelText('Nome completo'), 'Maria Oliveira')
    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-com-12-caracteres')
    await userEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }))

    expect(await screen.findByRole('heading', { name: 'Ambientes cadastrados' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/auth/register'))).toBe(true)
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/auth/login'))).toBe(true)
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/auth/me'))).toBe(true)
  })
})
