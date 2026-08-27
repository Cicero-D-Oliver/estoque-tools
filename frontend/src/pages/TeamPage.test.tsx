import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { renderWithProviders } from '../test/render'
import { accountFixture, jsonResponse, organizationFixture, sessionFixture } from '../test/fixtures'
import type { MemberProfile, Organization, OrganizationMember } from '../types/api'

const activeMembers: OrganizationMember[] = [
  {
    id: 1,
    organizacaoId: 12,
    usuarioId: accountFixture.id,
    usuarioNome: accountFixture.nome,
    usuarioEmail: accountFixture.email,
    perfil: 'ADMIN',
    status: 'ATIVO',
    solicitadoEm: '2026-08-20T10:00:00',
    aprovadoEm: '2026-08-20T10:00:00',
    aprovadoPorUsuarioId: accountFixture.id,
    removidoEm: null,
  },
  {
    id: 2,
    organizacaoId: 12,
    usuarioId: 9,
    usuarioNome: 'João Silva',
    usuarioEmail: 'joao@empresa.com',
    perfil: 'OPERADOR',
    status: 'ATIVO',
    solicitadoEm: '2026-08-21T09:00:00',
    aprovadoEm: '2026-08-21T10:00:00',
    aprovadoPorUsuarioId: accountFixture.id,
    removidoEm: null,
  },
]

const pendingMembers: OrganizationMember[] = [
  {
    id: 3,
    organizacaoId: 12,
    usuarioId: 10,
    usuarioNome: 'Ana Costa',
    usuarioEmail: 'ana@empresa.com',
    perfil: 'CONSULTA',
    status: 'PENDENTE',
    solicitadoEm: '2026-08-27T08:00:00',
    aprovadoEm: null,
    aprovadoPorUsuarioId: null,
    removidoEm: null,
  },
]

interface TeamFetchOptions {
  profile?: MemberProfile
  empty?: boolean
  failList?: boolean
  includeForeign?: boolean
}

function teamFetch(options: TeamFetchOptions = {}) {
  const organization: Organization = { ...organizationFixture, perfil: options.profile ?? 'ADMIN' }
  const members = structuredClone(options.empty ? [] : activeMembers)
  const pending = structuredClone(options.empty ? [] : pendingMembers)
  if (options.includeForeign) {
    members.push({ ...activeMembers[1], id: 99, organizacaoId: 99, usuarioNome: 'Pessoa de outra organização' })
  }

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const payload = init?.body ? JSON.parse(String(init.body)) as { perfil?: MemberProfile } : {}
    const approveMatch = url.match(/\/api\/organizacoes\/12\/solicitacoes\/(\d+)\/aprovacao$/)
    const profileMatch = url.match(/\/api\/organizacoes\/12\/membros\/(\d+)\/perfil$/)
    const memberMatch = url.match(/\/api\/organizacoes\/12\/membros\/(\d+)$/)

    if (url.endsWith('/api/auth/login')) return jsonResponse(sessionFixture)
    if (url.endsWith('/api/auth/me')) return jsonResponse(accountFixture)
    if (url.endsWith('/api/organizacoes')) return jsonResponse([organization])
    if (url.endsWith('/api/ferramentas/emprestadas')) return jsonResponse([])
    if (url.endsWith('/api/ferramentas')) return jsonResponse([])
    if (url.endsWith('/api/movimentacoes-ferramenta/pendentes')) return jsonResponse([])
    if (url.endsWith('/api/movimentacoes-ferramenta')) return jsonResponse([])
    if (url.endsWith('/api/itens/abaixo-minimo')) return jsonResponse([])
    if (approveMatch && method === 'PUT') {
      const index = pending.findIndex((member) => member.id === Number(approveMatch[1]))
      const [member] = pending.splice(index, 1)
      const approved = { ...member, perfil: payload.perfil ?? 'CONSULTA', status: 'ATIVO' as const, aprovadoEm: '2026-08-27T14:00:00' }
      members.push(approved)
      return jsonResponse(approved)
    }
    if (profileMatch && method === 'PUT') {
      const member = members.find((item) => item.id === Number(profileMatch[1]))!
      member.perfil = payload.perfil ?? member.perfil
      return jsonResponse(member)
    }
    if (memberMatch && method === 'DELETE') {
      const member = members.find((item) => item.id === Number(memberMatch[1]))!
      member.status = 'REMOVIDO'
      member.removidoEm = '2026-08-27T14:10:00'
      return new Response(null, { status: 204 })
    }
    if (url.endsWith('/api/organizacoes/12/solicitacoes')) return jsonResponse(pending)
    if (url.endsWith('/api/organizacoes/12/membros')) {
      if (options.failList) return jsonResponse({ codigo: 'ERRO_INTERNO', detalhe: 'stack interno' }, 500)
      return jsonResponse(members)
    }
    throw new Error(`URL inesperada: ${method} ${url}`)
  })
  return { fetchMock }
}

async function loginAndSelect(options: TeamFetchOptions = {}) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
  const state = teamFetch(options)
  vi.stubGlobal('fetch', state.fetchMock)
  renderWithProviders(<App />, ['/login'])
  await userEvent.type(screen.getByLabelText('E-mail'), 'maria@empresa.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await userEvent.click(await screen.findByRole('button', { name: /almoxarifado central/i }))
  return state
}

async function openTeam(options: TeamFetchOptions = {}) {
  const state = await loginAndSelect(options)
  await userEvent.click(await screen.findByRole('link', { name: 'Equipe' }))
  if (!options.failList) await screen.findByPlaceholderText('Buscar por nome ou e-mail')
  return state
}

function requestCall(fetchMock: ReturnType<typeof vi.fn>, suffix: string, method?: string) {
  return fetchMock.mock.calls.find(([input, init]) => (
    String(input).endsWith(suffix) && (!method || (init?.method ?? 'GET') === method)
  ))
}

describe('gestão operacional da equipe', () => {
  it('carrega membros e solicitações reais somente da organização selecionada', async () => {
    const { fetchMock } = await openTeam()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Ana Costa')).toBeInTheDocument()
    const membersCall = requestCall(fetchMock, '/api/organizacoes/12/membros')
    expect((membersCall?.[1]?.headers as Headers).get('X-Organization-Id')).toBe('12')
    expect(requestCall(fetchMock, '/api/organizacoes/12/solicitacoes')).toBeDefined()
  })

  it('mostra ações administrativas para ADMIN', async () => {
    await openTeam()
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Alterar perfil' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Remover' }).length).toBeGreaterThan(0)
  })

  it('não oferece ações que removeriam o último administrador', async () => {
    await openTeam()
    const adminRow = screen.getByLabelText('Maria Oliveira, Administrador')
    expect(adminRow).toHaveTextContent('Último administrador')
    expect(within(adminRow).queryByRole('button', { name: 'Alterar perfil' })).not.toBeInTheDocument()
    expect(within(adminRow).queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument()
  })

  it('não apresenta acesso à Equipe para OPERADOR', async () => {
    const { fetchMock } = await loginAndSelect({ profile: 'OPERADOR' })
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/organizacoes/12/membros')).toBeUndefined()
  })

  it('não apresenta acesso à Equipe para CONSULTA', async () => {
    const { fetchMock } = await loginAndSelect({ profile: 'CONSULTA' })
    expect(screen.queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/organizacoes/12/solicitacoes')).toBeUndefined()
  })

  it('aprova solicitação com perfil operacional e atualiza as duas listas', async () => {
    const { fetchMock } = await openTeam()
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    const dialog = screen.getByRole('dialog', { name: 'Aprovar acesso' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Perfil'), 'OPERADOR')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Aprovar acesso' }))
    expect(await screen.findByText('Acesso aprovado.')).toBeInTheDocument()
    const call = requestCall(fetchMock, '/api/organizacoes/12/solicitacoes/3/aprovacao', 'PUT')
    expect(call?.[1]?.body).toBe(JSON.stringify({ perfil: 'OPERADOR' }))
    await waitFor(() => expect(screen.getByText('Nenhum acesso aguardando aprovação.')).toBeInTheDocument())
    expect(screen.getByLabelText('Ana Costa, Operador')).toHaveTextContent('Ativo')
  })

  it('não permite aprovar solicitação diretamente como Administrador', async () => {
    await openTeam()
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    const options = within(screen.getByRole('dialog', { name: 'Aprovar acesso' })).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['Operador', 'Consulta'])
  })

  it('altera o perfil de membro ativo', async () => {
    const { fetchMock } = await openTeam()
    const row = screen.getByLabelText('João Silva, Operador')
    await userEvent.click(within(row).getByRole('button', { name: 'Alterar perfil' }))
    const dialog = screen.getByRole('dialog', { name: 'Alterar perfil' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Perfil'), 'CONSULTA')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar perfil' }))
    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/organizacoes/12/membros/2/perfil', 'PUT')?.[1]?.body)
      .toBe(JSON.stringify({ perfil: 'CONSULTA' }))
    expect(await screen.findByLabelText('João Silva, Consulta')).toBeInTheDocument()
  })

  it('remove o vínculo sem dizer que a conta foi excluída', async () => {
    const { fetchMock } = await openTeam()
    const row = screen.getByLabelText('João Silva, Operador')
    await userEvent.click(within(row).getByRole('button', { name: 'Remover' }))
    const dialog = screen.getByRole('dialog', { name: 'Remover acesso' })
    expect(dialog).toHaveTextContent('A conta não será excluída')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remover acesso' }))
    expect(await screen.findByText('Acesso removido.')).toBeInTheDocument()
    expect(requestCall(fetchMock, '/api/organizacoes/12/membros/2', 'DELETE')).toBeDefined()
    expect(await screen.findByLabelText('João Silva, Operador')).toHaveTextContent('Acesso removido')
  })

  it('nunca apresenta membro retornado para outra organização', async () => {
    await openTeam({ includeForeign: true })
    expect(screen.queryByText('Pessoa de outra organização')).not.toBeInTheDocument()
  })

  it('mostra estado vazio compacto', async () => {
    await openTeam({ empty: true })
    expect(screen.getByText('Nenhum membro neste ambiente.')).toBeInTheDocument()
  })

  it('mostra erro sanitizado e permite tentar novamente', async () => {
    await openTeam({ failList: true })
    expect(await screen.findByText('Não foi possível carregar a equipe.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(screen.queryByText(/stack interno/i)).not.toBeInTheDocument()
  })

  it('preserva nome, e-mail, perfil, situação e ação no mobile sem overflow', async () => {
    await openTeam()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    window.dispatchEvent(new Event('resize'))
    const row = screen.getByLabelText('João Silva, Operador')
    expect(row).toHaveTextContent('João Silva')
    expect(row).toHaveTextContent('joao@empresa.com')
    expect(row).toHaveTextContent('Operador')
    expect(row).toHaveTextContent('Ativo')
    expect(within(row).getByRole('button', { name: 'Alterar perfil' })).toBeInTheDocument()
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
  })
})
