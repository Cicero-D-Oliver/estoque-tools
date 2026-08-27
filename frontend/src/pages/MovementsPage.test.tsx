import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { renderWithProviders } from '../test/render'
import { accountFixture, jsonResponse, organizationFixture, sessionFixture } from '../test/fixtures'
import type { MemberProfile, Organization, StockMovement, ToolMovement } from '../types/api'

const toolMovements: ToolMovement[] = [
  {
    id: 41,
    ferramentaId: 2,
    ferramentaNome: 'Furadeira Bosch',
    ferramentaPatrimonio: 'PAT-018',
    usuarioId: accountFixture.id,
    usuarioNome: accountFixture.nome,
    responsavelUsuarioId: 9,
    responsavelUsuarioNome: 'João Silva',
    responsavelAnteriorUsuarioId: null,
    responsavelAnteriorUsuarioNome: null,
    tipoMovimentacao: 'RETIRADA',
    dataHora: '2026-08-27T12:43:00Z',
    observacao: 'Uso na montagem',
    destino: 'Linha 3',
    statusRevisao: 'PENDENTE',
    confirmadoPorUsuarioId: null,
    confirmadoPorUsuarioNome: null,
    confirmadoEm: null,
  },
  {
    id: 40,
    ferramentaId: 3,
    ferramentaNome: 'Esmerilhadeira Makita',
    ferramentaPatrimonio: 'PAT-019',
    usuarioId: 9,
    usuarioNome: 'João Silva',
    responsavelUsuarioId: null,
    responsavelUsuarioNome: null,
    responsavelAnteriorUsuarioId: 9,
    responsavelAnteriorUsuarioNome: 'João Silva',
    tipoMovimentacao: 'DEVOLUCAO',
    dataHora: '2026-08-27T11:20:00Z',
    observacao: null,
    destino: null,
    statusRevisao: 'CONFIRMADA',
    confirmadoPorUsuarioId: accountFixture.id,
    confirmadoPorUsuarioNome: accountFixture.nome,
    confirmadoEm: '2026-08-27T11:25:00Z',
  },
  {
    id: 39,
    ferramentaId: 4,
    ferramentaNome: 'Martelete',
    ferramentaPatrimonio: 'PAT-020',
    usuarioId: accountFixture.id,
    usuarioNome: accountFixture.nome,
    responsavelUsuarioId: 10,
    responsavelUsuarioNome: 'Carlos Souza',
    responsavelAnteriorUsuarioId: 9,
    responsavelAnteriorUsuarioNome: 'João Silva',
    tipoMovimentacao: 'TRANSFERENCIA',
    dataHora: '2026-08-27T10:00:00Z',
    observacao: 'Troca de turno',
    destino: 'Obra externa',
    statusRevisao: 'CONFIRMADA',
    confirmadoPorUsuarioId: accountFixture.id,
    confirmadoPorUsuarioNome: accountFixture.nome,
    confirmadoEm: '2026-08-27T10:05:00Z',
  },
]

const stockMovements: StockMovement[] = [
  {
    id: 70,
    itemEstoqueId: 12,
    itemEstoqueNome: 'Cabo CAT6',
    usuarioId: accountFixture.id,
    usuarioNome: accountFixture.nome,
    tipoMovimentacao: 'ENTRADA',
    quantidade: 50,
    dataHora: '2026-08-27T13:10:00',
    observacao: 'Compra mensal',
  },
  {
    id: 69,
    itemEstoqueId: 13,
    itemEstoqueNome: 'Conector RJ45',
    usuarioId: 10,
    usuarioNome: 'Carlos Souza',
    tipoMovimentacao: 'SAIDA',
    quantidade: 12,
    dataHora: '2026-08-27T09:10:00',
    observacao: null,
  },
]

interface MovementFetchOptions {
  profile?: MemberProfile
  empty?: boolean
  failList?: boolean
  failConfirmation?: boolean
}

function movementFetch(options: MovementFetchOptions = {}) {
  const organization: Organization = { ...organizationFixture, perfil: options.profile ?? 'ADMIN' }
  const tools = structuredClone(options.empty ? [] : toolMovements)
  const stock = structuredClone(options.empty ? [] : stockMovements)
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
    if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
    if (url.endsWith('/api/organizacoes')) return jsonResponse([organization])
    if (url.endsWith('/api/ferramentas/emprestadas')) return jsonResponse([])
    if (url.endsWith('/api/ferramentas')) return jsonResponse([])
    if (url.endsWith('/api/itens/abaixo-minimo')) return jsonResponse([])
    if (url.match(/\/api\/movimentacoes-ferramenta\/\d+\/confirmacao$/) && method === 'POST') {
      if (options.failConfirmation) return jsonResponse({ codigo: 'CONFLITO', mensagem: 'Estado divergente' }, 409)
      const movementId = Number(url.match(/(\d+)\/confirmacao$/)?.[1])
      const movement = tools.find((item) => item.id === movementId)
      if (!movement) return jsonResponse({ codigo: 'NAO_ENCONTRADO' }, 404)
      movement.statusRevisao = 'CONFIRMADA'
      movement.confirmadoPorUsuarioId = accountFixture.id
      movement.confirmadoPorUsuarioNome = accountFixture.nome
      movement.confirmadoEm = '2026-08-27T13:30:00Z'
      return jsonResponse(movement)
    }
    if (url.endsWith('/api/movimentacoes-ferramenta/pendentes')) {
      return jsonResponse(tools.filter((movement) => movement.statusRevisao === 'PENDENTE'))
    }
    if (url.endsWith('/api/movimentacoes-ferramenta')) {
      if (options.failList) return jsonResponse({ codigo: 'ERRO_INTERNO', detalhe: 'stack interno' }, 500)
      return jsonResponse(tools)
    }
    if (url.endsWith('/api/movimentacoes-estoque')) return jsonResponse(stock)
    throw new Error(`URL inesperada: ${method} ${url}`)
  })
  return { fetchMock }
}

async function openMovements(options: MovementFetchOptions = {}) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
  const state = movementFetch(options)
  vi.stubGlobal('fetch', state.fetchMock)
  renderWithProviders(<App />, ['/login'])
  await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))
  await userEvent.click(await screen.findByRole('link', { name: 'Movimentações' }))
  if (!options.failList) await screen.findByPlaceholderText('Buscar por item, patrimônio, pessoa ou destino')
  return state
}

function requestCall(fetchMock: ReturnType<typeof vi.fn>, suffix: string, method?: string) {
  return fetchMock.mock.calls.find(([input, init]) => (
    String(input).endsWith(suffix) && (!method || (init?.method ?? 'GET') === method)
  ))
}

describe('histórico operacional de movimentações', () => {
  it('carrega históricos reais de ferramentas e estoque com a organização selecionada', async () => {
    const { fetchMock } = await openMovements()
    expect(screen.getByText(/Furadeira Bosch/)).toBeInTheDocument()
    expect(screen.getByText('Cabo CAT6')).toBeInTheDocument()
    const toolCall = requestCall(fetchMock, '/api/movimentacoes-ferramenta')
    const stockCall = requestCall(fetchMock, '/api/movimentacoes-estoque')
    expect((toolCall?.[1]?.headers as Headers).get('X-Organization-Id')).toBe('12')
    expect((stockCall?.[1]?.headers as Headers).get('X-Organization-Id')).toBe('12')
  })

  it('apresenta tipos de ferramenta sem enums técnicos', async () => {
    await openMovements()
    expect(screen.getByText('Retirada')).toBeInTheDocument()
    expect(screen.getByText('Devolução')).toBeInTheDocument()
    expect(screen.getByText('Transferência')).toBeInTheDocument()
    expect(screen.queryByText('RETIRADA')).not.toBeInTheDocument()
  })

  it('apresenta entrada e saída de estoque em linguagem operacional', async () => {
    await openMovements()
    const cable = screen.getByLabelText(/Entrada de 50 unidades de Cabo CAT6/)
    const connectors = screen.getByLabelText(/Saída de 12 unidades de Conector RJ45/)
    expect(cable).toHaveTextContent('50 unidades')
    expect(connectors).toHaveTextContent('12 unidades')
  })

  it('filtra somente movimentações de ferramentas', async () => {
    await openMovements()
    await userEvent.click(screen.getByRole('button', { name: 'Ferramentas' }))
    expect(screen.getByText(/Furadeira Bosch/)).toBeInTheDocument()
    expect(screen.queryByText(/Cabo CAT6/)).not.toBeInTheDocument()
  })

  it('filtra somente movimentações de estoque', async () => {
    await openMovements()
    await userEvent.click(screen.getByRole('button', { name: 'Estoque' }))
    expect(screen.getByText(/Cabo CAT6/)).toBeInTheDocument()
    expect(screen.queryByText(/Furadeira Bosch/)).not.toBeInTheDocument()
  })

  it('destaca para ADMIN o que aguarda conferência', async () => {
    const { fetchMock } = await openMovements()
    expect(screen.getByText('1 movimentação aguarda conferência.')).toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/movimentacoes-ferramenta/pendentes')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Ver pendentes' }))
    expect(screen.getByText(/Furadeira Bosch/)).toBeInTheDocument()
    expect(screen.queryByText(/Esmerilhadeira Makita/)).not.toBeInTheDocument()
  })

  it('confirma administrativamente sem enviar payload operacional e atualiza o histórico', async () => {
    const { fetchMock } = await openMovements()
    const row = screen.getByLabelText(/Maria Oliveira retirou Furadeira Bosch/)
    await userEvent.click(within(row).getByRole('button', { name: 'Confirmar' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirmar movimentação' })
    expect(dialog).toHaveTextContent('A operação já foi realizada')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('Movimentação confirmada.')).toBeInTheDocument()
    const call = requestCall(fetchMock, '/api/movimentacoes-ferramenta/41/confirmacao', 'POST')
    expect(call).toBeDefined()
    expect(call?.[1]?.body).toBeUndefined()
    await waitFor(() => expect(screen.getByText('Nada aguardando conferência.')).toBeInTheDocument())
  })

  it('não mostra confirmação nem consulta pendências para OPERADOR', async () => {
    const { fetchMock } = await openMovements({ profile: 'OPERADOR' })
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pendentes/ })).not.toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/movimentacoes-ferramenta/pendentes')).toBeUndefined()
  })

  it('mantém CONSULTA somente em leitura', async () => {
    await openMovements({ profile: 'CONSULTA' })
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Detalhes' }).length).toBeGreaterThan(0)
  })

  it('abre detalhes com dados reais e metadados de confirmação', async () => {
    await openMovements()
    const row = screen.getByLabelText(/João Silva devolveu Esmerilhadeira Makita/)
    await userEvent.click(within(row).getByRole('button', { name: 'Detalhes' }))
    const details = screen.getByRole('dialog', { name: 'Devolução' })
    expect(details).toHaveTextContent('João Silva')
    expect(details).toHaveTextContent('Confirmada por')
    expect(details).toHaveTextContent(accountFixture.nome)
    expect(details).not.toHaveTextContent('usuarioId')
  })

  it('mostra estado vazio compacto', async () => {
    await openMovements({ empty: true })
    expect(screen.getByText('Nenhuma movimentação registrada.')).toBeInTheDocument()
  })

  it('mostra erro sanitizado e permite tentar novamente', async () => {
    await openMovements({ failList: true })
    expect(await screen.findByText('Não foi possível carregar as movimentações.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.queryByText(/stack interno/i)).not.toBeInTheDocument()
  })

  it('busca por destino, pessoa e patrimônio', async () => {
    await openMovements()
    const search = screen.getByPlaceholderText('Buscar por item, patrimônio, pessoa ou destino')
    await userEvent.type(search, 'obra Carlos PAT-020')
    expect(screen.getByText(/Martelete/)).toBeInTheDocument()
    expect(screen.queryByText(/Furadeira Bosch/)).not.toBeInTheDocument()
  })

  it('filtra movimentações confirmadas sem misturar estoque', async () => {
    await openMovements()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmados' }))
    expect(screen.getByText(/Esmerilhadeira Makita/)).toBeInTheDocument()
    expect(screen.queryByText(/Furadeira Bosch/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cabo CAT6/)).not.toBeInTheDocument()
  })

  it('preserva no mobile quando, item, executor, resultado e conferência sem overflow', async () => {
    await openMovements()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    window.dispatchEvent(new Event('resize'))
    const row = screen.getByLabelText(/Maria Oliveira retirou Furadeira Bosch/)
    expect(row).toHaveTextContent('Furadeira Bosch')
    expect(row).toHaveTextContent(accountFixture.nome)
    expect(row).toHaveTextContent('João Silva')
    expect(row).toHaveTextContent('Linha 3')
    expect(row).toHaveTextContent('Pendente')
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
  })
})
