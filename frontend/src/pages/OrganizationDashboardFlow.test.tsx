import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { renderWithProviders } from '../test/render'
import {
  accountFixture,
  jsonResponse,
  organizationFixture,
  sessionFixture,
} from '../test/fixtures'
import type { Organization, StockItem, Tool, ToolMovement } from '../types/api'

const toolsFixture: Tool[] = [
  {
    id: 1,
    patrimonio: 'PAT-01',
    nome: 'Furadeira',
    categoria: 'Elétrica',
    status: 'DISPONIVEL',
    responsavelAtualId: null,
    responsavelAtualNome: null,
    responsavelDesde: null,
    destinoAtual: null,
    localizacao: 'Armário 1',
    ativo: true,
  },
  {
    id: 2,
    patrimonio: 'PAT-02',
    nome: 'Martelete',
    categoria: 'Elétrica',
    status: 'EMPRESTADA',
    responsavelAtualId: 7,
    responsavelAtualNome: 'Maria Oliveira',
    responsavelDesde: '2026-08-21T12:30:00',
    destinoAtual: 'Manutenção elétrica — Galpão 2',
    localizacao: 'Armário 2',
    ativo: true,
  },
  {
    id: 3,
    patrimonio: 'PAT-03',
    nome: 'Serra',
    categoria: 'Corte',
    status: 'MANUTENCAO',
    responsavelAtualId: null,
    responsavelAtualNome: null,
    responsavelDesde: null,
    destinoAtual: null,
    localizacao: 'Bancada',
    ativo: true,
  },
  {
    id: 4,
    patrimonio: 'PAT-04',
    nome: 'Alicate',
    categoria: 'Manual',
    status: 'PERDIDA',
    responsavelAtualId: null,
    responsavelAtualNome: null,
    responsavelDesde: null,
    destinoAtual: null,
    localizacao: 'Armário 3',
    ativo: true,
  },
]

const movementFixture: ToolMovement = {
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
  observacao: 'Uso na manutenção preventiva',
  destino: 'Manutenção elétrica — Galpão 2',
  statusRevisao: 'PENDENTE',
  confirmadoPorUsuarioId: null,
  confirmadoPorUsuarioNome: null,
  confirmadoEm: null,
}

const lowStockFixture: StockItem = {
  id: 1,
  codigo: 'PARAF-01',
  nome: 'Parafuso sextavado',
  categoria: 'Fixadores',
  quantidadeAtual: 4,
  quantidadeMinima: 10,
  localizacao: 'Prateleira 2',
  ativo: true,
  abaixoMinimo: true,
}

interface DashboardFixtures {
  tools: Tool[]
  borrowedTools: Tool[]
  movements: ToolMovement[]
  pendingMovements: ToolMovement[]
  lowStockItems: StockItem[]
}

function operationalFetch(
  organizations: Organization[] = [organizationFixture],
  overrides: Partial<DashboardFixtures> = {},
) {
  const dashboardData: DashboardFixtures = {
    tools: toolsFixture,
    borrowedTools: [toolsFixture[1]],
    movements: [movementFixture],
    pendingMovements: [movementFixture],
    lowStockItems: [lowStockFixture],
    ...overrides,
  }

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
    if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
    if (url.endsWith('/api/organizacoes') && init?.method === 'POST') return jsonResponse(organizationFixture, 201)
    if (url.endsWith('/api/organizacoes')) return jsonResponse(organizations)
    if (url.endsWith('/api/ferramentas/emprestadas')) return jsonResponse(dashboardData.borrowedTools)
    if (url.endsWith('/api/ferramentas')) return jsonResponse(dashboardData.tools)
    if (url.endsWith('/api/movimentacoes-ferramenta/pendentes')) return jsonResponse(dashboardData.pendingMovements)
    if (url.endsWith('/api/movimentacoes-ferramenta')) return jsonResponse(dashboardData.movements)
    if (url.endsWith('/api/itens/abaixo-minimo')) return jsonResponse(dashboardData.lowStockItems)
    throw new Error(`URL inesperada: ${url}`)
  })
}

async function login() {
  await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'uma-senha-segura')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

async function openDashboard(fetchMock: ReturnType<typeof operationalFetch>) {
  vi.stubGlobal('fetch', fetchMock)
  renderWithProviders(<App />, ['/login'])
  await login()
  await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))
  await screen.findByRole('heading', { name: 'Almoxarifado Central' })
}

describe('fluxo organização e dashboard', () => {
  it('mantém a seleção de ambientes direta quando já existe uma organização', async () => {
    vi.stubGlobal('fetch', operationalFetch())
    renderWithProviders(<App />, ['/login'])

    await login()

    expect(await screen.findByRole('heading', { name: 'Seu ambiente de trabalho' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /almoxarifado central/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /^criar organização$/i })).toBeInTheDocument()
    expect(screen.queryByText('Escolha uma organização')).not.toBeInTheDocument()
    expect(screen.queryByText(/Cada ambiente mantém ferramentas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/backend valida seu vínculo/i)).not.toBeInTheDocument()
  })

  it('mantém Novo ambiente e permite fechar o modal por Cancelar ou X', async () => {
    vi.stubGlobal('fetch', operationalFetch([]))
    renderWithProviders(<App />, ['/login'])

    await login()
    await screen.findByText('Nenhuma organização ainda')
    await userEvent.click(screen.getByRole('button', { name: /^criar organização$/i }))

    let dialog = screen.getByRole('dialog', { name: 'Novo ambiente' })
    expect(within(dialog).getByRole('heading', { name: 'Novo ambiente' })).toBeInTheDocument()
    expect(within(dialog).queryByText('Criar organização')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nome da organização')).toHaveAttribute('placeholder', 'Ex.: Almoxarifado Central')
    expect(within(dialog).getByRole('button', { name: 'Criar ambiente' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^criar organização$/i }))
    dialog = screen.getByRole('dialog', { name: 'Novo ambiente' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fechar janela' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza resumo compacto, atenção real e envia o tenant', async () => {
    const fetchMock = operationalFetch()
    await openDashboard(fetchMock)

    expect(screen.getByText('Ferramentas ativas').previousElementSibling).toHaveTextContent('4')
    expect(screen.getByText('Disponíveis').previousElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Em uso').previousElementSibling).toHaveTextContent('1')
    expect(screen.getByText('Aguardam conferência').previousElementSibling).toHaveTextContent('1')
    expect(screen.getByText('1 movimentação aguarda conferência')).toBeInTheDocument()
    expect(screen.getByText('1 ferramenta está em manutenção')).toBeInTheDocument()
    expect(screen.getByText('1 ferramenta está marcada como perdida')).toBeInTheDocument()
    expect(screen.getByText('1 item está abaixo do mínimo')).toBeInTheDocument()
    expect(document.querySelector('.metric-grid')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.metric-card')).toHaveLength(0)

    const domainCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = String(input)
      return url.includes('/api/ferramentas')
        || url.includes('/api/movimentacoes-ferramenta')
        || url.includes('/api/itens/abaixo-minimo')
    })
    expect(domainCalls).toHaveLength(5)
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

    expect(await screen.findByRole('heading', { name: 'Almoxarifado Central' })).toBeInTheDocument()
    const creationCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/api/organizacoes') && init?.method === 'POST')
    expect(creationCall).toBeDefined()
    expect(creationCall?.[1]?.body).toBe(JSON.stringify({ nome: 'Almoxarifado Central' }))
  })

  it('mantém controles semânticos e renomeia Dashboard para Início', async () => {
    await openDashboard(operationalFetch())

    expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
    expect(screen.getAllByRole('button', { name: 'Fechar menu' })).toHaveLength(2)
  })

  it('não apresenta informação administrativa para CONSULTA', async () => {
    const consultaOrganization = { ...organizationFixture, perfil: 'CONSULTA' as const }
    const fetchMock = operationalFetch([consultaOrganization])
    await openDashboard(fetchMock)

    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/pendentes'))).toBe(false)
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/resumo'))).toBe(false)
    expect(screen.queryByRole('heading', { name: 'Aguardando conferência' })).not.toBeInTheDocument()
    expect(screen.queryByText('Aguardam conferência')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument()
  })

  it('apresenta erro do almoxarifado sem detalhes internos', async () => {
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

    expect(await screen.findByText('Não foi possível atualizar a situação do almoxarifado')).toBeInTheDocument()
    expect(screen.queryByText(/ERRO_INTERNO/)).not.toBeInTheDocument()
  })

  it('prioriza Com você para OPERADOR sem exibir pendências administrativas', async () => {
    const operatorOrganization = { ...organizationFixture, perfil: 'OPERADOR' as const }
    const fetchMock = operationalFetch([operatorOrganization])
    await openDashboard(fetchMock)

    const personalSection = screen.getByRole('heading', { name: 'Com você' }).closest('section')
    expect(personalSection).not.toBeNull()
    expect(within(personalSection!).getByText('Martelete')).toBeInTheDocument()
    expect(within(personalSection!).getByText('PAT-02')).toBeInTheDocument()
    expect(within(personalSection!).getByText('Sob sua responsabilidade')).toBeInTheDocument()
    expect(within(personalSection!).getByText('Manutenção elétrica — Galpão 2')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/pendentes'))).toBe(false)
    expect(screen.queryByRole('heading', { name: 'Aguardando conferência' })).not.toBeInTheDocument()
  })

  it('mostra responsável, destino e retirada nas ferramentas em uso, com as mais antigas primeiro', async () => {
    const olderTool: Tool = {
      ...toolsFixture[1],
      id: 5,
      patrimonio: 'PAT-00',
      nome: 'Furadeira antiga',
      responsavelAtualId: 8,
      responsavelAtualNome: 'Carlos Henrique',
      responsavelDesde: '2026-08-20T08:00:00',
      destinoAtual: 'Linha 1',
    }
    await openDashboard(operationalFetch([organizationFixture], {
      borrowedTools: [toolsFixture[1], olderTool],
    }))

    const section = screen.getByRole('heading', { name: 'Ferramentas em uso' }).closest('section')
    expect(section).not.toBeNull()
    const rows = section!.querySelectorAll('.tool-use-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Furadeira antiga')
    expect(rows[0]).toHaveTextContent('Com Carlos Henrique')
    expect(rows[0]).toHaveTextContent('Linha 1')
    expect(rows[0]).toHaveTextContent('Retirada em')
    expect(rows[1]).toHaveTextContent('Martelete')
  })

  it('mantém estados vazios compactos e operacionais', async () => {
    const consultaOrganization = { ...organizationFixture, perfil: 'CONSULTA' as const }
    await openDashboard(operationalFetch([consultaOrganization], {
      tools: [],
      borrowedTools: [],
      movements: [],
      pendingMovements: [],
      lowStockItems: [],
    }))

    expect(screen.getByText('Tudo conferido por enquanto.')).toHaveClass('compact-empty')
    expect(screen.getByText('Todas as ferramentas estão no almoxarifado.')).toHaveClass('compact-empty')
    expect(screen.getByText('Ainda não houve movimentações nesta organização.')).toHaveClass('compact-empty')
    expect(document.querySelector('.feedback--empty')).not.toBeInTheDocument()
  })

  it('transforma movimentações recentes em frases operacionais', async () => {
    const transfer: ToolMovement = {
      ...movementFixture,
      id: 19,
      ferramentaNome: 'Serra',
      ferramentaPatrimonio: 'PAT-03',
      tipoMovimentacao: 'TRANSFERENCIA',
      usuarioNome: 'Carlos',
      responsavelUsuarioNome: 'Ana',
      statusRevisao: 'CONFIRMADA',
    }
    const returnMovement: ToolMovement = {
      ...movementFixture,
      id: 18,
      ferramentaNome: 'Furadeira',
      ferramentaPatrimonio: 'PAT-01',
      tipoMovimentacao: 'DEVOLUCAO',
      usuarioNome: 'João',
      responsavelUsuarioNome: null,
      statusRevisao: 'CONFIRMADA',
    }
    await openDashboard(operationalFetch([organizationFixture], {
      movements: [movementFixture, transfer, returnMovement],
    }))

    expect(screen.getByText('Maria Oliveira retirou Martelete PAT-02')).toBeInTheDocument()
    expect(screen.getByText('Carlos transferiu Serra PAT-03 para Ana')).toBeInTheDocument()
    expect(screen.getByText('João devolveu Furadeira PAT-01')).toBeInTheDocument()
    expect(screen.getAllByText('Pendente')).toHaveLength(1)
    expect(screen.queryByText('Confirmada')).not.toBeInTheDocument()
  })

  it('usa a fila real de pendências e nunca consulta o resumo incremental', async () => {
    const fetchMock = operationalFetch()
    await openDashboard(fetchMock)

    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/movimentacoes-ferramenta/pendentes'))).toBe(true)
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/resumo?aposId=0'))).toBe(false)
    const pendingSection = screen.getByRole('heading', { name: 'Aguardando conferência' }).closest('section')
    expect(pendingSection).not.toBeNull()
    expect(within(pendingSection!).getByText('Retirada')).toBeInTheDocument()
    expect(within(pendingSection!).getByText('Martelete · PAT-02')).toBeInTheDocument()
    expect(within(pendingSection!).getByText('Registrada por Maria Oliveira')).toBeInTheDocument()
    expect(within(pendingSection!).getByText('Responsável: Maria Oliveira')).toBeInTheDocument()
    expect(within(pendingSection!).getByText('Destino: Manutenção elétrica — Galpão 2')).toBeInTheDocument()
    expect(within(pendingSection!).getByText('Uso na manutenção preventiva')).toBeInTheDocument()
  })

  it('sinaliza ferramenta emprestada sem responsável como inconsistência', async () => {
    const inconsistentTool: Tool = {
      ...toolsFixture[1],
      id: 6,
      responsavelAtualId: null,
      responsavelAtualNome: null,
    }
    await openDashboard(operationalFetch([organizationFixture], { borrowedTools: [inconsistentTool] }))

    expect(screen.getByText('Responsável não informado')).toBeInTheDocument()
    expect(screen.getByText('Verificar inconsistência operacional')).toBeInTheDocument()
    expect(screen.getByText('Responsável não informado').closest('.tool-use-row')).toHaveClass('tool-use-row--inconsistent')
  })

  it('limita visualmente os últimos registros aos seis primeiros da API', async () => {
    const movements = Array.from({ length: 7 }, (_, index): ToolMovement => ({
      ...movementFixture,
      id: 30 - index,
      ferramentaNome: `Ferramenta ${index + 1}`,
      ferramentaPatrimonio: `PAT-${index + 10}`,
      statusRevisao: 'CONFIRMADA',
    }))
    await openDashboard(operationalFetch([organizationFixture], { movements }))

    const records = screen.getByRole('heading', { name: 'Últimos registros' }).closest('section')
    expect(records?.querySelectorAll('.record-row')).toHaveLength(6)
    expect(within(records!).getByText(/Ferramenta 1/)).toBeInTheDocument()
    expect(within(records!).queryByText(/Ferramenta 7/)).not.toBeInTheDocument()
  })

  it('usa cabeçalho compacto sem linguagem de template', async () => {
    await openDashboard(operationalFetch())

    expect(screen.getByRole('heading', { name: 'Almoxarifado Central' })).toBeInTheDocument()
    expect(screen.getAllByText('Almoxarifado Central')).toHaveLength(2)
    expect(screen.getByText('Olá, Maria.')).toBeInTheDocument()
    expect(screen.queryByText('Hoje no almoxarifado')).not.toBeInTheDocument()
    expect(screen.queryByText('Visão operacional')).not.toBeInTheDocument()
    expect(screen.queryByText('Área de apoio')).not.toBeInTheDocument()
    expect(screen.queryByText('Próximas ações')).not.toBeInTheDocument()
    expect(screen.queryByText(/fundação/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Auditoria')).not.toBeInTheDocument()
    expect(screen.queryByText('Movimentações recentes')).not.toBeInTheDocument()
    expect(screen.queryByText('Ocorrências que merecem acompanhamento.')).not.toBeInTheDocument()
    expect(screen.queryByText('Responsáveis, destinos e horários de retirada.')).not.toBeInTheDocument()
    expect(screen.queryByText('Operações já realizadas que precisam de revisão administrativa.')).not.toBeInTheDocument()
    expect(screen.queryByText('Ferramentas sob sua responsabilidade neste momento.')).not.toBeInTheDocument()
    expect(screen.queryByText('O que aconteceu mais recentemente na organização.')).not.toBeInTheDocument()
  })

  it('mostra para ADMIN um indicador derivado da fila real de pendências', async () => {
    const secondPending = { ...movementFixture, id: 21 }
    await openDashboard(operationalFetch([organizationFixture], {
      pendingMovements: [movementFixture, secondPending],
    }))

    const indicator = screen.getByRole('status', { name: '2 pendências aguardam conferência' })
    expect(indicator).toHaveTextContent('2')
    expect(indicator).toHaveTextContent('pendências')
  })

  it('não exibe contador zero nem indicador administrativo sem dados reais', async () => {
    await openDashboard(operationalFetch([organizationFixture], { pendingMovements: [] }))

    expect(screen.queryByLabelText(/pendência.*aguarda.*conferência/i)).not.toBeInTheDocument()
    expect(document.querySelector('.dashboard-heading__pending')).not.toBeInTheDocument()
  })
})
