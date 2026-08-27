import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { renderWithProviders } from '../test/render'
import { accountFixture, jsonResponse, organizationFixture, sessionFixture } from '../test/fixtures'
import type { MemberProfile, Organization, StockItem, StockMovement } from '../types/api'

const initialItems: StockItem[] = [
  {
    id: 1,
    codigo: 'PARAF-008',
    nome: 'Parafuso 8mm',
    categoria: 'Fixadores',
    quantidadeAtual: 340,
    quantidadeMinima: 100,
    localizacao: 'Corredor A',
    ativo: true,
    abaixoMinimo: false,
  },
  {
    id: 2,
    codigo: 'CABO-CAT6',
    nome: 'Cabo CAT6',
    categoria: 'Elétrica',
    quantidadeAtual: 18,
    quantidadeMinima: 30,
    localizacao: 'Prateleira 3',
    ativo: true,
    abaixoMinimo: true,
  },
  {
    id: 3,
    codigo: 'LUVA-NIT',
    nome: 'Luva nitrílica',
    categoria: 'EPI',
    quantidadeAtual: 0,
    quantidadeMinima: 20,
    localizacao: null,
    ativo: true,
    abaixoMinimo: true,
  },
  {
    id: 4,
    codigo: 'FITA-ISO',
    nome: 'Fita isolante',
    categoria: 'Elétrica',
    quantidadeAtual: 0,
    quantidadeMinima: 0,
    localizacao: 'Gaveta 4',
    ativo: true,
    abaixoMinimo: false,
  },
  {
    id: 5,
    codigo: 'TINTA-OLD',
    nome: 'Tinta descontinuada',
    categoria: null,
    quantidadeAtual: 2,
    quantidadeMinima: 1,
    localizacao: null,
    ativo: false,
    abaixoMinimo: false,
  },
]

const initialHistory: StockMovement[] = [
  {
    id: 31,
    itemEstoqueId: 1,
    itemEstoqueNome: 'Parafuso 8mm',
    usuarioId: accountFixture.id,
    usuarioNome: accountFixture.nome,
    tipoMovimentacao: 'SAIDA',
    quantidade: 12,
    dataHora: '2026-08-27T09:30:00',
    observacao: 'Uso na montagem',
  },
  {
    id: 30,
    itemEstoqueId: 1,
    itemEstoqueNome: 'Parafuso 8mm',
    usuarioId: 9,
    usuarioNome: 'Carlos Souza',
    tipoMovimentacao: 'ENTRADA',
    quantidade: 50,
    dataHora: '2026-08-26T14:15:00',
    observacao: null,
  },
]

interface FetchOptions {
  profile?: MemberProfile
  items?: StockItem[]
  failList?: boolean
  failExit?: boolean
}

function inventoryFetch(options: FetchOptions = {}) {
  const profile = options.profile ?? 'ADMIN'
  const organization: Organization = { ...organizationFixture, perfil: profile }
  const items = structuredClone(options.items ?? initialItems)
  const history = structuredClone(initialHistory)
  let nextMovementId = 50

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const payload = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
    const itemMatch = url.match(/\/api\/itens\/(\d+)(?:\/(.+))?$/)

    if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
    if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
    if (url.endsWith('/api/organizacoes')) return jsonResponse([organization])
    if (url.endsWith('/api/ferramentas/emprestadas')) return jsonResponse([])
    if (url.endsWith('/api/movimentacoes-ferramenta/pendentes')) return jsonResponse([])
    if (url.endsWith('/api/movimentacoes-ferramenta')) return jsonResponse([])
    if (url.endsWith('/api/ferramentas')) return jsonResponse([])
    if (url.endsWith('/api/itens/abaixo-minimo')) {
      return jsonResponse(items.filter((item) => item.ativo && item.quantidadeAtual < item.quantidadeMinima))
    }
    if (url.endsWith('/api/itens') && method === 'POST') {
      const created: StockItem = {
        id: 6,
        codigo: String(payload.codigo),
        nome: String(payload.nome),
        categoria: payload.categoria ? String(payload.categoria) : null,
        quantidadeAtual: Number(payload.quantidadeAtual),
        quantidadeMinima: Number(payload.quantidadeMinima),
        localizacao: payload.localizacao ? String(payload.localizacao) : null,
        ativo: true,
        abaixoMinimo: Number(payload.quantidadeAtual) < Number(payload.quantidadeMinima),
      }
      items.push(created)
      return jsonResponse(created, 201)
    }
    if (url.endsWith('/api/itens')) {
      if (options.failList) return jsonResponse({ codigo: 'ERRO_INTERNO', mensagem: 'Falha sanitizada' }, 500)
      return jsonResponse(items)
    }
    if (itemMatch) {
      const itemId = Number(itemMatch[1])
      const operation = itemMatch[2]
      const item = items.find((candidate) => candidate.id === itemId)
      if (!item) return jsonResponse({ codigo: 'NAO_ENCONTRADO' }, 404)
      if (operation === 'historico') return jsonResponse(history.filter((movement) => movement.itemEstoqueId === itemId))
      if (!operation && method === 'GET') return jsonResponse(item)
      if (!operation && method === 'PUT') {
        Object.assign(item, {
          codigo: payload.codigo,
          nome: payload.nome,
          categoria: payload.categoria ?? null,
          quantidadeMinima: payload.quantidadeMinima,
          localizacao: payload.localizacao ?? null,
        })
        item.abaixoMinimo = item.quantidadeAtual < item.quantidadeMinima
        return jsonResponse(item)
      }
      if (!operation && method === 'DELETE') {
        item.ativo = false
        return new Response(null, { status: 204 })
      }
      if (operation === 'saida' && options.failExit) {
        return jsonResponse({ codigo: 'REGRA_NEGOCIO', mensagem: 'Quantidade insuficiente em estoque' }, 400)
      }
      const quantity = Number(payload.quantidade)
      if (operation === 'entrada') item.quantidadeAtual += quantity
      if (operation === 'saida') item.quantidadeAtual -= quantity
      if (operation === 'correcao') item.quantidadeAtual = quantity
      item.abaixoMinimo = item.quantidadeAtual < item.quantidadeMinima
      const movement: StockMovement = {
        id: nextMovementId++,
        itemEstoqueId: item.id,
        itemEstoqueNome: item.nome,
        usuarioId: accountFixture.id,
        usuarioNome: accountFixture.nome,
        tipoMovimentacao: operation === 'entrada' ? 'ENTRADA' : operation === 'saida' ? 'SAIDA' : 'CORRECAO',
        quantidade: quantity,
        dataHora: '2026-08-27T10:00:00',
        observacao: payload.observacao ? String(payload.observacao) : null,
      }
      history.unshift(movement)
      return jsonResponse(movement, 201)
    }
    throw new Error(`URL inesperada: ${method} ${url}`)
  })

  return { fetchMock, items }
}

async function openInventory(options: FetchOptions = {}) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
  const state = inventoryFetch(options)
  vi.stubGlobal('fetch', state.fetchMock)
  renderWithProviders(<App />, ['/login'])
  await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))
  await userEvent.click(await screen.findByRole('link', { name: 'Estoque' }))
  if (!options.failList) await screen.findByPlaceholderText('Buscar por nome ou código')
  return state
}

function requestCall(fetchMock: ReturnType<typeof vi.fn>, suffix: string, method?: string) {
  return fetchMock.mock.calls.find(([input, init]) =>
    String(input).endsWith(suffix) && (!method || (init?.method ?? 'GET') === method))
}

async function openDetails(name: string) {
  await userEvent.click(screen.getByLabelText(`Abrir detalhes de ${name}`))
  return screen.findByRole('dialog', { name })
}

describe('tela operacional de Estoque', () => {
  it('carrega a lista real em composição densa com sete colunas', async () => {
    const { fetchMock } = await openInventory()
    const list = screen.getByRole('region', { name: 'Lista de itens de estoque' })
    expect(within(list).getByText('Parafuso 8mm')).toBeInTheDocument()
    expect(within(list).getByText('CABO-CAT6')).toBeInTheDocument()
    expect(list.querySelector('.inventory-list__header')?.children).toHaveLength(7)
    const call = requestCall(fetchMock, '/api/itens')
    expect((call?.[1]?.headers as Headers).get('X-Organization-Id')).toBe('12')
  })

  it('mostra quantidade atual, mínimo e local reais', async () => {
    await openInventory()
    const row = screen.getByLabelText('Abrir detalhes de Parafuso 8mm')
    expect(row).toHaveTextContent('340')
    expect(row).toHaveTextContent('100')
    expect(row).toHaveTextContent('Corredor A')
  })

  it('usa o endpoint oficial de abaixo do mínimo', async () => {
    const { fetchMock } = await openInventory()
    expect(requestCall(fetchMock, '/api/itens/abaixo-minimo')).toBeDefined()
    expect(screen.getByLabelText('Abrir detalhes de Cabo CAT6')).toHaveTextContent('Abaixo do mínimo')
  })

  it('distingue estoque normal, abaixo do mínimo e sem estoque', async () => {
    await openInventory()
    expect(screen.getByLabelText('Abrir detalhes de Parafuso 8mm')).toHaveTextContent('Normal')
    expect(screen.getByLabelText('Abrir detalhes de Cabo CAT6')).toHaveTextContent('Abaixo do mínimo')
    expect(screen.getByLabelText('Abrir detalhes de Luva nitrílica')).toHaveTextContent('Sem estoque')
  })

  it('busca por nome ignorando caixa e acentos', async () => {
    await openInventory()
    await userEvent.type(screen.getByPlaceholderText('Buscar por nome ou código'), '  LUVA NITRILICA  ')
    expect(screen.getByText('Luva nitrílica')).toBeInTheDocument()
    expect(screen.queryByText('Parafuso 8mm')).not.toBeInTheDocument()
    expect(screen.getByText('1 encontrado')).toBeInTheDocument()
  })

  it('busca por código e limpa com um comando', async () => {
    await openInventory()
    await userEvent.type(screen.getByPlaceholderText('Buscar por nome ou código'), 'cat6')
    expect(screen.getByText('Cabo CAT6')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }))
    expect(screen.getByText('Parafuso 8mm')).toBeInTheDocument()
  })

  it.each([
    ['Abaixo do mínimo', 'Cabo CAT6'],
    ['Estoque normal', 'Parafuso 8mm'],
    ['Sem estoque', 'Luva nitrílica'],
    ['Inativos', 'Tinta descontinuada'],
  ])('aplica o filtro %s', async (filter, expected) => {
    await openInventory()
    await userEvent.click(screen.getByRole('button', { name: filter }))
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('inclui itens sem estoque que pertencem à lista oficial abaixo do mínimo', async () => {
    await openInventory()
    await userEvent.click(screen.getByRole('button', { name: 'Abaixo do mínimo' }))
    expect(screen.getByText('Cabo CAT6')).toBeInTheDocument()
    expect(screen.getByText('Luva nitrílica')).toBeInTheDocument()
    expect(screen.getByText('2 encontrados')).toBeInTheDocument()
  })

  it('oculta inativos no filtro inicial', async () => {
    await openInventory()
    expect(screen.queryByText('Tinta descontinuada')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativos' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('abre detalhes com os dados reais do item', async () => {
    await openInventory()
    const details = await openDetails('Cabo CAT6')
    expect(details).toHaveTextContent('18')
    expect(details).toHaveTextContent('30')
    expect(details).toHaveTextContent('Prateleira 3')
    expect(details).toHaveTextContent('Elétrica')
  })

  it('carrega histórico somente ao abrir detalhes e ordena o mais recente primeiro', async () => {
    const { fetchMock } = await openInventory()
    expect(requestCall(fetchMock, '/api/itens/1/historico')).toBeUndefined()
    const details = await openDetails('Parafuso 8mm')
    await within(details).findByText('Saída de 12 unidades')
    const entries = details.querySelectorAll('.inventory-history__item')
    expect(entries[0]).toHaveTextContent('Saída de 12 unidades')
    expect(entries[0]).toHaveTextContent(accountFixture.nome)
    expect(entries[1]).toHaveTextContent('Entrada de 50 unidades')
    expect(details).not.toHaveTextContent('SAIDA')
  })

  it('registra entrada com quantidade e observação', async () => {
    const { fetchMock } = await openInventory({ profile: 'OPERADOR' })
    const row = screen.getByLabelText('Abrir detalhes de Parafuso 8mm')
    await userEvent.click(within(row).getByRole('button', { name: 'Entrada' }))
    const dialog = screen.getByRole('dialog', { name: 'Entrada de estoque' })
    await userEvent.type(within(dialog).getByLabelText('Quantidade'), '10')
    await userEvent.type(within(dialog).getByLabelText('Observação (opcional)'), 'Compra mensal')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar entrada' }))
    expect(await screen.findByText('Entrada registrada.')).toBeInTheDocument()
    expect(screen.getByLabelText('Abrir detalhes de Parafuso 8mm')).toHaveTextContent('350')
    expect(requestCall(fetchMock, '/api/itens/1/entrada', 'POST')?.[1]?.body)
      .toBe(JSON.stringify({ quantidade: 10, observacao: 'Compra mensal' }))
  })

  it('registra saída e atualiza a lista', async () => {
    const { fetchMock } = await openInventory({ profile: 'OPERADOR' })
    const row = screen.getByLabelText('Abrir detalhes de Parafuso 8mm')
    await userEvent.click(within(row).getByRole('button', { name: 'Saída' }))
    const dialog = screen.getByRole('dialog', { name: 'Saída de estoque' })
    await userEvent.type(within(dialog).getByLabelText('Quantidade'), '12')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar saída' }))
    expect(await screen.findByText('Saída registrada.')).toBeInTheDocument()
    expect(screen.getByLabelText('Abrir detalhes de Parafuso 8mm')).toHaveTextContent('328')
    expect(requestCall(fetchMock, '/api/itens/1/saida', 'POST')).toBeDefined()
  })

  it('rejeita quantidade inválida antes de chamar a API', async () => {
    const { fetchMock } = await openInventory({ profile: 'OPERADOR' })
    const row = screen.getByLabelText('Abrir detalhes de Parafuso 8mm')
    await userEvent.click(within(row).getByRole('button', { name: 'Entrada' }))
    const dialog = screen.getByRole('dialog', { name: 'Entrada de estoque' })
    await userEvent.type(within(dialog).getByLabelText('Quantidade'), '0')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar entrada' }))
    expect(within(dialog).getByText('Informe uma quantidade maior que zero.')).toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/itens/1/entrada', 'POST')).toBeUndefined()
  })

  it('apresenta erro curto para estoque insuficiente', async () => {
    await openInventory({ profile: 'OPERADOR', failExit: true })
    const row = screen.getByLabelText('Abrir detalhes de Cabo CAT6')
    await userEvent.click(within(row).getByRole('button', { name: 'Saída' }))
    const dialog = screen.getByRole('dialog', { name: 'Saída de estoque' })
    await userEvent.type(within(dialog).getByLabelText('Quantidade'), '20')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar saída' }))
    expect(await within(dialog).findByText('Estoque insuficiente.')).toBeInTheDocument()
  })

  it('cadastra item como ADMIN usando apenas o DTO real', async () => {
    const { fetchMock } = await openInventory()
    await userEvent.click(screen.getByRole('button', { name: 'Novo item' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo item' })
    await userEvent.type(within(dialog).getByLabelText('Código'), 'ARR-010')
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Arruela 10mm')
    await userEvent.type(within(dialog).getByLabelText('Categoria (opcional)'), 'Fixadores')
    await userEvent.clear(within(dialog).getByLabelText('Quantidade inicial'))
    await userEvent.type(within(dialog).getByLabelText('Quantidade inicial'), '50')
    await userEvent.clear(within(dialog).getByLabelText('Estoque mínimo'))
    await userEvent.type(within(dialog).getByLabelText('Estoque mínimo'), '20')
    await userEvent.type(within(dialog).getByLabelText('Local (opcional)'), 'Gaveta 9')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cadastrar item' }))
    expect(await screen.findByText('Item cadastrado.')).toBeInTheDocument()
    expect(await screen.findByText('Arruela 10mm')).toBeInTheDocument()
    const body = JSON.parse(String(requestCall(fetchMock, '/api/itens', 'POST')?.[1]?.body))
    expect(body).toEqual({
      codigo: 'ARR-010', nome: 'Arruela 10mm', categoria: 'Fixadores',
      quantidadeAtual: 50, quantidadeMinima: 20, localizacao: 'Gaveta 9',
    })
    expect(body).not.toHaveProperty('usuarioId')
  })

  it('edita cadastro sem editar o saldo diretamente', async () => {
    const { fetchMock } = await openInventory()
    const details = await openDetails('Parafuso 8mm')
    await userEvent.click(within(details).getByRole('button', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar item' })
    expect(within(dialog).queryByLabelText('Quantidade inicial')).not.toBeInTheDocument()
    const name = within(dialog).getByLabelText('Nome')
    await userEvent.clear(name)
    await userEvent.type(name, 'Parafuso sextavado 8mm')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Item atualizado.')).toBeInTheDocument()
    const body = JSON.parse(String(requestCall(fetchMock, '/api/itens/1', 'PUT')?.[1]?.body))
    expect(body.nome).toBe('Parafuso sextavado 8mm')
    expect(body.quantidadeAtual).toBe(340)
  })

  it('registra correção compensatória com novo saldo e motivo obrigatório', async () => {
    const { fetchMock } = await openInventory()
    const details = await openDetails('Parafuso 8mm')
    await userEvent.click(within(details).getByRole('button', { name: 'Corrigir estoque' }))
    const dialog = screen.getByRole('dialog', { name: 'Corrigir estoque' })
    await userEvent.type(within(dialog).getByLabelText('Novo saldo'), '320')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar correção' }))
    expect(within(dialog).getByText('Informe o motivo da correção.')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'Contagem física')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar correção' }))
    expect(await screen.findByText('Estoque corrigido.')).toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/itens/1/correcao', 'POST')?.[1]?.body)
      .toBe(JSON.stringify({ quantidade: 320, observacao: 'Contagem física' }))
  })

  it('inativa com confirmação explícita e preservação do histórico', async () => {
    const { fetchMock } = await openInventory()
    const details = await openDetails('Parafuso 8mm')
    await userEvent.click(within(details).getByRole('button', { name: 'Inativar' }))
    const dialog = screen.getByRole('dialog', { name: 'Inativar item' })
    expect(within(dialog).getByText(/histórico será preservado/i)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Inativar item' }))
    expect(await screen.findByText('Item inativado.')).toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/itens/1', 'DELETE')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar detalhes' }))
    expect(screen.queryByText('Parafuso 8mm')).not.toBeInTheDocument()
  })

  it('mostra ao OPERADOR apenas operações permitidas', async () => {
    await openInventory({ profile: 'OPERADOR' })
    expect(screen.queryByRole('button', { name: 'Novo item' })).not.toBeInTheDocument()
    const row = screen.getByLabelText('Abrir detalhes de Parafuso 8mm')
    expect(within(row).getByRole('button', { name: 'Entrada' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Saída' })).toBeInTheDocument()
    const details = await openDetails('Parafuso 8mm')
    expect(within(details).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(within(details).queryByRole('button', { name: 'Corrigir estoque' })).not.toBeInTheDocument()
  })

  it('mantém CONSULTA somente em leitura', async () => {
    await openInventory({ profile: 'CONSULTA' })
    expect(screen.queryByRole('button', { name: 'Novo item' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrada' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Saída' })).not.toBeInTheDocument()
    const details = await openDetails('Parafuso 8mm')
    expect(within(details).queryByRole('heading', { name: 'Movimentar estoque' })).not.toBeInTheDocument()
    expect(within(details).getByRole('heading', { name: 'Histórico' })).toBeInTheDocument()
  })

  it('mostra estado vazio compacto e cadastro somente para ADMIN', async () => {
    await openInventory({ items: [] })
    expect(screen.getByText('Nenhum item cadastrado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar item' })).toBeInTheDocument()
  })

  it('mostra resultado vazio de busca e permite limpar', async () => {
    await openInventory()
    await userEvent.type(screen.getByPlaceholderText('Buscar por nome ou código'), 'não existe')
    expect(screen.getByText('Nenhum item encontrado para “não existe”.')).toBeInTheDocument()
    const clearButtons = screen.getAllByRole('button', { name: 'Limpar busca' })
    await userEvent.click(clearButtons[clearButtons.length - 1])
    expect(screen.getByText('Parafuso 8mm')).toBeInTheDocument()
  })

  it('mostra erro de carregamento sanitizado e oferece nova tentativa', async () => {
    await openInventory({ failList: true })
    expect(await screen.findByText('Não foi possível carregar o estoque.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.queryByText(/stack|exception/i)).not.toBeInTheDocument()
  })

  it('mantém no mobile nome, código, quantidade, mínimo, situação, local e ações sem overflow', async () => {
    await openInventory({ profile: 'OPERADOR' })
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    window.dispatchEvent(new Event('resize'))
    const row = screen.getByLabelText('Abrir detalhes de Parafuso 8mm')
    expect(row).toHaveTextContent('Parafuso 8mm')
    expect(row).toHaveTextContent('PARAF-008')
    expect(row).toHaveTextContent('340')
    expect(row).toHaveTextContent('100')
    expect(row).toHaveTextContent('Normal')
    expect(row).toHaveTextContent('Corredor A')
    expect(within(row).getByRole('button', { name: 'Entrada' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Saída' })).toBeInTheDocument()
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
  })
})
