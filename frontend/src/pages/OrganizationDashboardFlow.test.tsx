import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { renderWithProviders } from '../test/render'
import {
  accountFixture,
  jsonResponse,
  organizationFixture,
  sessionFixture,
} from '../test/fixtures'

function operationalFetch(organizations = [organizationFixture]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
    if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
    if (url.endsWith('/api/organizacoes') && init?.method === 'POST') return jsonResponse(organizationFixture, 201)
    if (url.endsWith('/api/organizacoes')) return jsonResponse(organizations)
    if (url.endsWith('/api/ferramentas')) return jsonResponse([
      { id: 1, patrimonio: 'PAT-01', nome: 'Furadeira', categoria: 'Elétrica', status: 'DISPONIVEL', ativo: true },
      { id: 2, patrimonio: 'PAT-02', nome: 'Martelete', categoria: 'Elétrica', status: 'EMPRESTADA', ativo: true },
      { id: 3, patrimonio: 'PAT-03', nome: 'Serra', categoria: 'Corte', status: 'MANUTENCAO', ativo: true },
    ])
    if (url.includes('/api/movimentacoes-ferramenta/resumo')) return jsonResponse({
      cursorAnterior: 0,
      proximoCursor: 20,
      quantidadeNovas: 1,
      quantidadeRetornada: 1,
      temMais: false,
      quantidadePendentes: 2,
      ferramentasEmUso: 1,
      ferramentasEmManutencao: 1,
      ferramentasPerdidas: 0,
      movimentacoes: [{
        id: 20,
        ferramentaId: 2,
        ferramentaNome: 'Martelete',
        ferramentaPatrimonio: 'PAT-02',
        usuarioId: 7,
        usuarioNome: 'Maria Oliveira',
        responsavelUsuarioId: 7,
        responsavelUsuarioNome: 'Maria Oliveira',
        responsavelAnteriorUsuarioId: null,
        responsavelAnteriorUsuarioNome: null,
        tipoMovimentacao: 'RETIRADA',
        dataHora: '2026-08-21T12:30:00',
        observacao: null,
        destino: 'Linha 2',
        statusRevisao: 'PENDENTE',
        confirmadoPorUsuarioId: null,
        confirmadoPorUsuarioNome: null,
        confirmadoEm: null,
      }],
    })
    if (url.endsWith('/api/movimentacoes-ferramenta')) return jsonResponse([])
    throw new Error(`URL inesperada: ${url}`)
  })
}

async function login() {
  await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'uma-senha-segura')
  await userEvent.click(screen.getByRole('button', { name: /entrar no estoque tools/i }))
}

describe('fluxo organização e dashboard', () => {
  it('seleciona organização, envia o tenant e renderiza dados reais do dashboard', async () => {
    const fetchMock = operationalFetch()
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<App />, ['/login'])

    await login()
    await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))

    expect(await screen.findByRole('heading', { name: /olá, maria/i })).toBeInTheDocument()
    expect(screen.getByText('Ferramentas totais').nextElementSibling).toHaveTextContent('3')
    expect(screen.getByText('Disponíveis').nextElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Em uso').nextElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Confirmações pendentes').nextElementSibling).toHaveTextContent('2')
    expect(screen.getByText('Retirada registrada')).toBeInTheDocument()

    const domainCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/api/ferramentas') || String(input).includes('/api/movimentacoes-ferramenta'))
    expect(domainCalls).toHaveLength(3)
    domainCalls.forEach(([, init]) => {
      expect((init?.headers as Headers).get('X-Organization-Id')).toBe('12')
    })
  })

  it('cria a primeira organização e a seleciona para o dashboard', async () => {
    const fetchMock = operationalFetch([])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<App />, ['/login'])

    await login()
    expect(await screen.findByText('Nenhuma organização ainda')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^criar organização$/i }))
    await userEvent.type(screen.getByLabelText('Nome da organização'), 'Almoxarifado Central')
    await userEvent.click(screen.getByRole('button', { name: /criar ambiente/i }))

    expect(await screen.findByRole('heading', { name: /olá, maria/i })).toBeInTheDocument()
    const creationCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/api/organizacoes') && init?.method === 'POST')
    expect(creationCall).toBeDefined()
    expect(creationCall?.[1]?.body).toBe(JSON.stringify({ nome: 'Almoxarifado Central' }))
  })

  it('mantém controles semânticos para navegação adaptável', async () => {
    vi.stubGlobal('fetch', operationalFetch())
    renderWithProviders(<App />, ['/login'])
    await login()
    await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))
    await screen.findByRole('heading', { name: /olá, maria/i })

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getAllByRole('button', { name: 'Fechar menu' })).toHaveLength(2)
  })

  it('não consulta resumo administrativo para perfil CONSULTA', async () => {
    const consultaOrganization = { ...organizationFixture, perfil: 'CONSULTA' as const }
    const fetchMock = operationalFetch([consultaOrganization])
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<App />, ['/login'])
    await login()
    await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))
    await screen.findByRole('heading', { name: /olá, maria/i })

    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/resumo'))).toBe(false)
    expect(screen.getByText('Visível para ADMIN')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument()
  })

  it('apresenta estado de erro do dashboard sem detalhes internos', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
      if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
      if (url.endsWith('/api/organizacoes')) return jsonResponse([organizationFixture])
      return jsonResponse({ status: 500, codigo: 'ERRO_INTERNO', mensagem: 'Erro interno' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<App />, ['/login'])
    await login()
    await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))

    expect(await screen.findByText('Não foi possível carregar o dashboard')).toBeInTheDocument()
    expect(screen.queryByText(/ERRO_INTERNO/)).not.toBeInTheDocument()
  })
})
