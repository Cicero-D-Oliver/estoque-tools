import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { formatOperationalDateTime } from '../lib/format'
import { renderWithProviders } from '../test/render'
import {
  accountFixture,
  jsonResponse,
  organizationFixture,
  sessionFixture,
} from '../test/fixtures'
import type { MemberProfile, Organization, Tool, ToolMovement } from '../types/api'

const initialTools: Tool[] = [
  {
    id: 1,
    patrimonio: 'PAT-001',
    nome: 'Furadeira Bosch',
    categoria: 'Elétrica',
    status: 'DISPONIVEL',
    responsavelAtualId: null,
    responsavelAtualNome: null,
    responsavelDesde: null,
    destinoAtual: null,
    localizacao: 'Armário 2',
    ativo: true,
  },
  {
    id: 2,
    patrimonio: 'PAT-018',
    nome: 'Esmerilhadeira Makita',
    categoria: 'Elétrica',
    status: 'EMPRESTADA',
    responsavelAtualId: accountFixture.id,
    responsavelAtualNome: accountFixture.nome,
    responsavelDesde: '2026-08-26T11:43:00Z',
    destinoAtual: 'Linha 3',
    localizacao: 'Armário 4',
    ativo: true,
  },
  {
    id: 3,
    patrimonio: 'PAT-030',
    nome: 'Martelete',
    categoria: null,
    status: 'MANUTENCAO',
    responsavelAtualId: null,
    responsavelAtualNome: null,
    responsavelDesde: null,
    destinoAtual: null,
    localizacao: null,
    ativo: true,
  },
  {
    id: 4,
    patrimonio: 'PAT-040',
    nome: 'Alicate de pressão',
    categoria: 'Manual',
    status: 'PERDIDA',
    responsavelAtualId: null,
    responsavelAtualNome: null,
    responsavelDesde: null,
    destinoAtual: null,
    localizacao: 'Gaveta 7',
    ativo: true,
  },
  {
    id: 5,
    patrimonio: 'PAT-050',
    nome: 'Serra antiga',
    categoria: 'Corte',
    status: 'DISPONIVEL',
    responsavelAtualId: null,
    responsavelAtualNome: null,
    responsavelDesde: null,
    destinoAtual: null,
    localizacao: 'Depósito',
    ativo: false,
  },
]

const history: ToolMovement[] = [
  {
    id: 40,
    ferramentaId: 2,
    ferramentaNome: 'Esmerilhadeira Makita',
    ferramentaPatrimonio: 'PAT-018',
    usuarioId: accountFixture.id,
    usuarioNome: accountFixture.nome,
    responsavelUsuarioId: accountFixture.id,
    responsavelUsuarioNome: accountFixture.nome,
    responsavelAnteriorUsuarioId: null,
    responsavelAnteriorUsuarioNome: null,
    tipoMovimentacao: 'RETIRADA',
    dataHora: '2026-08-26T11:43:00Z',
    observacao: 'Uso programado',
    destino: 'Linha 3',
    statusRevisao: 'PENDENTE',
    confirmadoPorUsuarioId: null,
    confirmadoPorUsuarioNome: null,
    confirmadoEm: null,
  },
  {
    id: 39,
    ferramentaId: 2,
    ferramentaNome: 'Esmerilhadeira Makita',
    ferramentaPatrimonio: 'PAT-018',
    usuarioId: 9,
    usuarioNome: 'Carlos Souza',
    responsavelUsuarioId: null,
    responsavelUsuarioNome: null,
    responsavelAnteriorUsuarioId: 9,
    responsavelAnteriorUsuarioNome: 'Carlos Souza',
    tipoMovimentacao: 'DEVOLUCAO',
    dataHora: '2026-08-25T15:30:00Z',
    observacao: null,
    destino: null,
    statusRevisao: 'CONFIRMADA',
    confirmadoPorUsuarioId: accountFixture.id,
    confirmadoPorUsuarioNome: accountFixture.nome,
    confirmadoEm: '2026-08-25T15:35:00Z',
  },
]

interface FetchOptions {
  profile?: MemberProfile
  tools?: Tool[]
  failToolList?: boolean
}

function toolFetch(options: FetchOptions = {}) {
  const profile = options.profile ?? 'ADMIN'
  const organization: Organization = { ...organizationFixture, perfil: profile }
  const tools = structuredClone(options.tools ?? initialTools)
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const payload = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
    const toolMatch = url.match(/\/api\/ferramentas\/(\d+)(?:\/(.+))?$/)

    if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
    if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
    if (url.endsWith('/api/organizacoes')) return jsonResponse([organization])
    if (url.endsWith('/api/ferramentas/emprestadas')) {
      return jsonResponse(tools.filter((tool) => tool.ativo && tool.status === 'EMPRESTADA'))
    }
    if (url.endsWith('/api/movimentacoes-ferramenta/pendentes')) return jsonResponse([])
    if (url.endsWith('/api/movimentacoes-ferramenta')) return jsonResponse([])
    if (url.endsWith('/api/itens/abaixo-minimo')) return jsonResponse([])
    if (url.endsWith('/api/ferramentas/responsaveis-transferencia')) {
      return jsonResponse([{ id: accountFixture.id, nome: accountFixture.nome }, { id: 9, nome: 'Carlos Souza' }])
    }
    if (url.endsWith('/api/ferramentas') && method === 'POST') {
      const created: Tool = {
        id: 6,
        patrimonio: String(payload.patrimonio),
        nome: String(payload.nome),
        categoria: payload.categoria ? String(payload.categoria) : null,
        status: 'DISPONIVEL',
        responsavelAtualId: null,
        responsavelAtualNome: null,
        responsavelDesde: null,
        destinoAtual: null,
        localizacao: payload.localizacao ? String(payload.localizacao) : null,
        ativo: true,
      }
      tools.push(created)
      return jsonResponse(created, 201)
    }
    if (url.endsWith('/api/ferramentas')) {
      if (options.failToolList) return jsonResponse({ codigo: 'ERRO_INTERNO', detalhe: 'stacktrace secreto' }, 500)
      return jsonResponse(tools)
    }
    if (toolMatch) {
      const toolId = Number(toolMatch[1])
      const operation = toolMatch[2]
      const tool = tools.find((item) => item.id === toolId)
      if (!tool) return jsonResponse({ codigo: 'NAO_ENCONTRADO' }, 404)
      if (operation === 'historico') return jsonResponse(history.filter((movement) => movement.ferramentaId === toolId))
      if (!operation && method === 'GET') return jsonResponse(tool)
      if (!operation && method === 'PUT') {
        Object.assign(tool, payload)
        return jsonResponse(tool)
      }
      if (!operation && method === 'DELETE') {
        tool.ativo = false
        return new Response(null, { status: 204 })
      }
      if (operation === 'retirada') {
        Object.assign(tool, {
          status: 'EMPRESTADA',
          responsavelAtualId: accountFixture.id,
          responsavelAtualNome: accountFixture.nome,
          responsavelDesde: '2026-08-26T13:00:00Z',
          destinoAtual: payload.destino ?? null,
        })
      }
      if (operation === 'devolucao' || operation === 'conclusao-manutencao') {
        Object.assign(tool, {
          status: 'DISPONIVEL',
          responsavelAtualId: null,
          responsavelAtualNome: null,
          responsavelDesde: null,
          destinoAtual: null,
        })
      }
      if (operation === 'transferencia') {
        Object.assign(tool, {
          responsavelAtualId: Number(payload.novoResponsavelUsuarioId),
          responsavelAtualNome: 'Carlos Souza',
          destinoAtual: payload.destino ?? tool.destinoAtual,
        })
      }
      if (operation === 'manutencao') Object.assign(tool, { status: 'MANUTENCAO' })
      if (operation === 'perda') Object.assign(tool, { status: 'PERDIDA' })
      if (operation === 'correcao') Object.assign(tool, { status: payload.novoStatus })
      return jsonResponse({ ...history[0], ferramentaId: tool.id })
    }
    throw new Error(`URL inesperada: ${method} ${url}`)
  })

  return { fetchMock, tools }
}

async function openTools(options: FetchOptions = {}) {
  const state = toolFetch(options)
  vi.stubGlobal('fetch', state.fetchMock)
  renderWithProviders(<App />, ['/login'])
  await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))
  await userEvent.click(await screen.findByRole('link', { name: 'Ferramentas' }))
  if (!options.failToolList) await screen.findByPlaceholderText('Buscar por nome ou patrimônio')
  return state
}

function operationalCall(fetchMock: ReturnType<typeof vi.fn>, suffix: string) {
  return fetchMock.mock.calls.find(([input]) => String(input).endsWith(suffix))
}

async function openDetails(name: string) {
  await userEvent.click(screen.getByLabelText(`Abrir detalhes de ${name}`))
  return screen.findByRole('dialog', { name })
}

describe('tela operacional de Ferramentas', () => {
  it('carrega lista densa com estado, responsável e localização reais', async () => {
    const { fetchMock } = await openTools()

    expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument()
    expect(screen.getByText('Esmerilhadeira Makita')).toBeInTheDocument()
    expect(screen.getAllByText('Em uso').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Com Maria Oliveira')).toBeInTheDocument()
    expect(screen.getByText('Linha 3')).toBeInTheDocument()
    expect(screen.queryByText('EMPRESTADA')).not.toBeInTheDocument()
    const listCall = operationalCall(fetchMock, '/api/ferramentas')
    expect((listCall?.[1]?.headers as Headers).get('X-Organization-Id')).toBe('12')
  })

  it('mantém as sete informações operacionais na tabela desktop', async () => {
    await openTools()
    const list = screen.getByRole('region', { name: 'Lista de ferramentas' })
    const header = list.querySelector('.tools-list__header')
    expect(header).not.toBeNull()
    expect(header?.children).toHaveLength(7)
    expect(header).toHaveTextContent('Ferramenta')
    expect(header).toHaveTextContent('Patrimônio')
    expect(header).toHaveTextContent('Situação')
    expect(header).toHaveTextContent('Responsável')
    expect(header).toHaveTextContent('Onde está')
    expect(header).toHaveTextContent('Desde')
    expect(header).toHaveTextContent('Ação')

    const availableRow = screen.getByLabelText('Abrir detalhes de Furadeira Bosch')
    const borrowedRow = screen.getByLabelText('Abrir detalhes de Esmerilhadeira Makita')
    expect(availableRow.querySelector('.tool-row__location')).toHaveTextContent('No almoxarifado · Armário 2')
    expect(borrowedRow.querySelector('.tool-row__location')).toHaveTextContent('Linha 3')
  })

  it('mostra horário local somente quando responsavelDesde é aplicável', async () => {
    await openTools()
    const availableRow = screen.getByLabelText('Abrir detalhes de Furadeira Bosch')
    const borrowedRow = screen.getByLabelText('Abrir detalhes de Esmerilhadeira Makita')
    const maintenanceRow = screen.getByLabelText('Abrir detalhes de Martelete')

    expect(availableRow.querySelector('.tool-row__since')).toHaveTextContent('—')
    expect(maintenanceRow.querySelector('.tool-row__location')).toHaveTextContent('—')
    expect(maintenanceRow.querySelector('.tool-row__since')).toHaveTextContent('—')
    expect(borrowedRow.querySelector('.tool-row__since')).toHaveTextContent(
      formatOperationalDateTime('2026-08-26T11:43:00Z'),
    )
  })

  it('busca imediatamente por nome, ignorando caixa', async () => {
    await openTools()
    await userEvent.type(screen.getByPlaceholderText('Buscar por nome ou patrimônio'), 'mAkItA')

    expect(screen.getByText('Esmerilhadeira Makita')).toBeInTheDocument()
    expect(screen.queryByText('Furadeira Bosch')).not.toBeInTheDocument()
    expect(screen.getByText('1 encontrada')).toBeInTheDocument()
  })

  it('busca por patrimônio e oferece limpeza', async () => {
    await openTools()
    await userEvent.type(screen.getByPlaceholderText('Buscar por nome ou patrimônio'), '  PAT-030  ')

    expect(screen.getByText('Martelete')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }))
    expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument()
  })

  it.each([
    ['Disponíveis', 'Furadeira Bosch'],
    ['Em uso', 'Esmerilhadeira Makita'],
    ['Manutenção', 'Martelete'],
    ['Perdidas', 'Alicate de pressão'],
    ['Inativas', 'Serra antiga'],
  ])('aplica o filtro %s', async (filter, expectedName) => {
    await openTools()
    await userEvent.click(screen.getByRole('button', { name: filter }))

    expect(screen.getByText(expectedName)).toBeInTheDocument()
    expect(screen.getByText('1 encontrada')).toBeInTheDocument()
  })

  it('oculta inativas no estado inicial', async () => {
    await openTools()
    expect(screen.queryByText('Serra antiga')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('não renderiza ações operacionais nem cadastrais para CONSULTA', async () => {
    await openTools({ profile: 'CONSULTA' })

    expect(screen.queryByRole('button', { name: 'Nova ferramenta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retirar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Comigo' })).not.toBeInTheDocument()
    const dialog = await openDetails('Furadeira Bosch')
    expect(within(dialog).queryByRole('heading', { name: 'Ações operacionais' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: 'Cadastro' })).not.toBeInTheDocument()
  })

  it('exibe para OPERADOR apenas ações permitidas e o filtro Comigo', async () => {
    await openTools({ profile: 'OPERADOR' })

    expect(screen.getByRole('button', { name: 'Comigo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nova ferramenta' })).not.toBeInTheDocument()
    const dialog = await openDetails('Esmerilhadeira Makita')
    expect(within(dialog).getByRole('button', { name: 'Transferir' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('exibe Nova ferramenta somente para ADMIN', async () => {
    await openTools()
    expect(screen.getByRole('button', { name: 'Nova ferramenta' })).toBeInTheDocument()
  })

  it('registra retirada com destino e observação', async () => {
    const { fetchMock } = await openTools({ profile: 'OPERADOR' })
    await userEvent.click(screen.getByRole('button', { name: 'Retirar' }))
    const dialog = screen.getByRole('dialog', { name: 'Retirar ferramenta' })
    await userEvent.type(within(dialog).getByLabelText('Destino (opcional)'), 'Linha 8')
    await userEvent.type(within(dialog).getByLabelText('Observação (opcional)'), 'Uso na montagem')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar retirada' }))

    expect(await screen.findByText('Retirada registrada.')).toBeInTheDocument()
    const call = operationalCall(fetchMock, '/api/ferramentas/1/retirada')
    expect(call?.[1]?.body).toBe(JSON.stringify({ observacao: 'Uso na montagem', destino: 'Linha 8' }))
  })

  it('registra devolução pela ação contextual', async () => {
    const { fetchMock } = await openTools({ profile: 'OPERADOR' })
    await userEvent.click(screen.getByRole('button', { name: 'Devolver' }))
    const dialog = screen.getByRole('dialog', { name: 'Devolver ferramenta' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar devolução' }))

    expect(await screen.findByText('Devolução registrada.')).toBeInTheDocument()
    expect(operationalCall(fetchMock, '/api/ferramentas/2/devolucao')).toBeDefined()
  })

  it('transfere somente para responsável elegível retornado pela API', async () => {
    const { fetchMock } = await openTools({ profile: 'OPERADOR' })
    const details = await openDetails('Esmerilhadeira Makita')
    await userEvent.click(within(details).getByRole('button', { name: 'Transferir' }))
    const dialog = await screen.findByRole('dialog', { name: 'Transferir ferramenta' })
    expect(within(dialog).queryByRole('option', { name: accountFixture.nome })).not.toBeInTheDocument()
    await userEvent.selectOptions(within(dialog).getByLabelText('Novo responsável'), '9')
    await userEvent.type(within(dialog).getByLabelText('Destino (opcional)'), 'Linha 5')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar transferência' }))

    expect(await screen.findByText('Transferência registrada.')).toBeInTheDocument()
    const call = operationalCall(fetchMock, '/api/ferramentas/2/transferencia')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ novoResponsavelUsuarioId: 9, destino: 'Linha 5' })
  })

  it('exige motivo e registra manutenção', async () => {
    const { fetchMock } = await openTools({ profile: 'OPERADOR' })
    const details = await openDetails('Furadeira Bosch')
    await userEvent.click(within(details).getByRole('button', { name: 'Enviar para manutenção' }))
    const dialog = screen.getByRole('dialog', { name: 'Enviar para manutenção' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar para manutenção' }))
    expect(within(dialog).getByText('Informe o motivo da manutenção.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'Cabo danificado')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar para manutenção' }))

    expect(await screen.findByText('Manutenção registrada.')).toBeInTheDocument()
    expect(operationalCall(fetchMock, '/api/ferramentas/1/manutencao')).toBeDefined()
  })

  it('conclui manutenção e atualiza o estado para Disponível', async () => {
    const { fetchMock } = await openTools({ profile: 'OPERADOR' })
    await userEvent.click(screen.getByRole('button', { name: 'Concluir manutenção' }))
    const dialog = screen.getByRole('dialog', { name: 'Concluir manutenção' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Concluir manutenção' }))

    expect(await screen.findByText('Ferramenta disponível novamente.')).toBeInTheDocument()
    expect(operationalCall(fetchMock, '/api/ferramentas/3/conclusao-manutencao')).toBeDefined()
    expect(screen.getAllByText('Disponível').length).toBeGreaterThanOrEqual(2)
  })

  it('exige motivo e registra perda', async () => {
    const { fetchMock } = await openTools({ profile: 'OPERADOR' })
    const details = await openDetails('Furadeira Bosch')
    await userEvent.click(within(details).getByRole('button', { name: 'Registrar perda' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar perda' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar perda' }))
    expect(within(dialog).getByText('Informe o motivo.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'Não localizada no inventário')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar perda' }))

    expect(await screen.findByText('Perda registrada.')).toBeInTheDocument()
    expect(operationalCall(fetchMock, '/api/ferramentas/1/perda')).toBeDefined()
  })

  it('carrega histórico apenas ao abrir detalhes e ordena o mais recente primeiro', async () => {
    const { fetchMock } = await openTools()
    expect(operationalCall(fetchMock, '/api/ferramentas/2/historico')).toBeUndefined()

    const details = await openDetails('Esmerilhadeira Makita')
    await within(details).findByText('Retirada por Maria Oliveira')
    expect(operationalCall(fetchMock, '/api/ferramentas/2/historico')).toBeDefined()
    const entries = details.querySelectorAll('.tool-history__item')
    expect(entries).toHaveLength(2)
    expect(entries[0]).toHaveTextContent('Retirada por Maria Oliveira')
    expect(entries[1]).toHaveTextContent('Devolvida ao almoxarifado')
    expect(details).not.toHaveTextContent('RETIRADA')
  })

  it('cadastra ferramenta como ADMIN usando apenas campos do DTO real', async () => {
    const { fetchMock } = await openTools()
    await userEvent.click(screen.getByRole('button', { name: 'Nova ferramenta' }))
    const dialog = screen.getByRole('dialog', { name: 'Nova ferramenta' })
    await userEvent.type(within(dialog).getByLabelText('Patrimônio'), 'PAT-060')
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Torquímetro')
    await userEvent.type(within(dialog).getByLabelText('Categoria (opcional)'), 'Medição')
    await userEvent.type(within(dialog).getByLabelText('Local de guarda (opcional)'), 'Armário 9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cadastrar ferramenta' }))

    expect(await screen.findByText('Ferramenta cadastrada.')).toBeInTheDocument()
    expect(await screen.findByText('Torquímetro')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/api/ferramentas') && init?.method === 'POST')
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      patrimonio: 'PAT-060', nome: 'Torquímetro', categoria: 'Medição', localizacao: 'Armário 9',
    })
  })

  it('permite ao ADMIN editar, inativar e corrigir sem expor essas ações na lista', async () => {
    await openTools()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    const details = await openDetails('Furadeira Bosch')
    expect(within(details).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(within(details).getByRole('button', { name: 'Inativar' })).toBeInTheDocument()
    expect(within(details).getByRole('button', { name: 'Corrigir estado' })).toBeInTheDocument()
  })

  it('edita o cadastro pelo detalhe com valores atuais preenchidos', async () => {
    const { fetchMock } = await openTools()
    const details = await openDetails('Furadeira Bosch')
    await userEvent.click(within(details).getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar ferramenta' })
    const name = within(dialog).getByLabelText('Nome')
    expect(name).toHaveValue('Furadeira Bosch')
    await userEvent.clear(name)
    await userEvent.type(name, 'Furadeira Bosch GSB')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Ferramenta atualizada.')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/api/ferramentas/1') && init?.method === 'PUT')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ nome: 'Furadeira Bosch GSB', patrimonio: 'PAT-001' })
  })

  it('inativa com confirmação explícita e sem oferecer reativação', async () => {
    const { fetchMock } = await openTools()
    const details = await openDetails('Furadeira Bosch')
    await userEvent.click(within(details).getByRole('button', { name: 'Inativar' }))
    const dialog = screen.getByRole('dialog', { name: 'Inativar ferramenta' })
    expect(within(dialog).getByText(/não possui reativação nesta versão/i)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Inativar ferramenta' }))

    expect(await screen.findByText('Ferramenta inativada.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input, init]) =>
      String(input).endsWith('/api/ferramentas/1') && init?.method === 'DELETE')).toBe(true)
    expect(screen.queryByRole('button', { name: /reativar/i })).not.toBeInTheDocument()
  })

  it('registra correção de estado com motivo obrigatório', async () => {
    const { fetchMock } = await openTools()
    const details = await openDetails('Furadeira Bosch')
    await userEvent.click(within(details).getByRole('button', { name: 'Corrigir estado' }))
    const dialog = screen.getByRole('dialog', { name: 'Corrigir estado' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Novo estado'), 'MANUTENCAO')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar correção' }))
    expect(within(dialog).getByText('Informe o motivo.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'Ajuste após conferência física')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar correção' }))

    expect(await screen.findByText('Estado corrigido.')).toBeInTheDocument()
    const call = operationalCall(fetchMock, '/api/ferramentas/1/correcao')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      novoStatus: 'MANUTENCAO', observacao: 'Ajuste após conferência física',
    })
  })

  it('exibe erro de carga sanitizado e permite tentar novamente', async () => {
    await openTools({ failToolList: true })

    expect(await screen.findByText('Não foi possível carregar as ferramentas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.queryByText(/stacktrace secreto/i)).not.toBeInTheDocument()
  })

  it('mostra estado vazio compacto e ação de cadastro apenas para ADMIN', async () => {
    await openTools({ tools: [] })

    expect(screen.getByText('Nenhuma ferramenta cadastrada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar ferramenta' })).toBeInTheDocument()
    expect(document.querySelector('.tools-empty')).toBeInTheDocument()
  })

  it('mantém no mobile nome, estado, patrimônio, responsabilidade, local e ação', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    window.dispatchEvent(new Event('resize'))
    await openTools({ profile: 'OPERADOR' })

    const row = screen.getByLabelText('Abrir detalhes de Esmerilhadeira Makita')
    expect(row).toHaveTextContent('Esmerilhadeira Makita')
    expect(row).toHaveTextContent('PAT-018')
    expect(row).toHaveTextContent('Em uso')
    expect(row).toHaveTextContent('Com Maria Oliveira')
    expect(row).toHaveTextContent('Linha 3')
    expect(within(row).getByRole('button', { name: 'Devolver' })).toBeInTheDocument()
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
  })

  it('fecha os detalhes e preserva a lista sem nova carga de históricos', async () => {
    const { fetchMock } = await openTools()
    const details = await openDetails('Furadeira Bosch')
    await userEvent.click(within(details).getByRole('button', { name: 'Fechar detalhes' }))

    expect(screen.queryByRole('dialog', { name: 'Furadeira Bosch' })).not.toBeInTheDocument()
    expect(screen.getByText('Furadeira Bosch')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/historico'))).toHaveLength(1)
  })
})
