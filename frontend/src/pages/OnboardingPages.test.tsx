import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { BootstrapPage } from './BootstrapPage'
import { ActivationPage } from './ActivationPage'
import { renderWithProviders } from '../test/render'
import { jsonResponse } from '../test/fixtures'

function renderActivation(token = 'token-seguro') {
  return renderWithProviders(
    <Routes>
      <Route path="/ativar" element={<ActivationPage />} />
      <Route path="/login" element={<h1>Login corporativo</h1>} />
    </Routes>,
    [`/ativar?token=${token}`],
  )
}

describe('onboarding corporativo', () => {
  it('cria conta a partir de convite válido e envia o contrato seguro', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/onboarding/ativacao?')) return jsonResponse({
        estado: 'VALIDO',
        email: 'ma***@scaladatacenters.com',
        organizacao: 'Almoxarifado Central',
        requerCriacaoConta: true,
      })
      if (url.endsWith('/api/onboarding/ativacao') && init?.method === 'POST') {
        return jsonResponse({ mensagem: 'Acesso ativado. Entre com seu e-mail e senha.' })
      }
      throw new Error(`URL inesperada: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderActivation()

    expect(await screen.findByText('ma***@scaladatacenters.com')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Maria Oliveira')
    await userEvent.type(screen.getByLabelText('Senha'), 'SenhaSegura!2026')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'SenhaSegura!2026')
    await userEvent.click(screen.getByRole('button', { name: 'Ativar acesso' }))

    expect(await screen.findByText('Acesso ativado. Entre com seu e-mail e senha.')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(post?.[1]?.body).toBe(JSON.stringify({
      token: 'token-seguro',
      nome: 'Maria Oliveira',
      senha: 'SenhaSegura!2026',
      confirmacaoSenha: 'SenhaSegura!2026',
    }))
  })

  it('não pede nova senha para conta já existente', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      estado: 'VALIDO',
      email: 'jo***@scaladatacenters.com',
      organizacao: 'Operação Sul',
      requerCriacaoConta: false,
    })))
    renderActivation()

    expect(await screen.findByText('jo***@scaladatacenters.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar acesso' })).toBeInTheDocument()
  })

  it.each([
    ['EXPIRADO', 'Este link expirou.'],
    ['UTILIZADO', 'Este link já foi utilizado.'],
    ['INVALIDO', 'Este link de ativação não é válido.'],
  ])('mostra estado %s sem abrir formulário', async (estado, mensagem) => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      estado,
      email: null,
      organizacao: null,
      requerCriacaoConta: false,
    })))
    renderActivation()

    expect(await screen.findByText(mensagem, { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ativar acesso' })).not.toBeInTheDocument()
  })

  it('solicita bootstrap sem expor se o e-mail configurado existe', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      mensagem: 'Se o e-mail estiver autorizado, enviaremos as instruções de ativação.',
    }, 202))
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(
      <Routes>
        <Route path="/ativar-admin" element={<BootstrapPage />} />
        <Route path="/login" element={<h1>Login corporativo</h1>} />
      </Routes>,
      ['/ativar-admin'],
    )

    await userEvent.type(screen.getByLabelText('E-mail'), 'admin@scaladatacenters.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link de ativação' }))
    expect(await screen.findByText(/Se o e-mail estiver autorizado/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/onboarding/bootstrap', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'admin@scaladatacenters.com' }),
    }))
  })
})
