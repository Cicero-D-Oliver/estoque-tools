import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { FeedbackState } from '../components/FeedbackState'
import { TeamActionDialog, type TeamAction } from '../components/team/TeamActionDialog'
import { ApiError } from '../lib/api-client'
import {
  combineMembers,
  filterMembers,
  memberStatusLabels,
  profileLabels,
  teamFilterLabels,
  type TeamFilter,
} from '../lib/team-ui'
import { useAuth } from '../providers/AuthProvider'
import { useOrganization } from '../providers/OrganizationProvider'
import { teamKeys, teamService } from '../services/team-service'
import type { MemberProfile, OrganizationMember } from '../types/api'

interface TeamMutationRequest {
  action: TeamAction
  member: OrganizationMember
  profile?: MemberProfile
}

function teamError(error: Error | null): string | undefined {
  if (!error) return undefined
  if (!(error instanceof ApiError)) return 'Não foi possível atualizar o acesso.'
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
  if (error.status === 403) return 'Você não tem permissão para esta ação.'
  if (error.status === 409) return 'Os dados foram alterados. Atualize a tela.'
  if (/ao menos um ADMIN/i.test(error.message)) return 'Este ambiente precisa manter ao menos um administrador.'
  return 'Não foi possível atualizar o acesso.'
}

export function TeamPage() {
  const queryClient = useQueryClient()
  const { account } = useAuth()
  const { selectedOrganization } = useOrganization()
  const organizationId = selectedOrganization?.id
  const [filter, setFilter] = useState<TeamFilter>('all')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<TeamAction | null>(null)
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setFilter('all')
    setSearch('')
    setAction(null)
    setSelectedMember(null)
    setFeedback(null)
  }, [organizationId])

  const membersQuery = useQuery({
    queryKey: organizationId ? teamKeys.members(organizationId) : teamKeys.all,
    queryFn: () => teamService.listMembers(organizationId!),
    enabled: Boolean(organizationId),
  })
  const pendingQuery = useQuery({
    queryKey: organizationId ? teamKeys.pending(organizationId) : [...teamKeys.all, 'pending'],
    queryFn: () => teamService.listPending(organizationId!),
    enabled: Boolean(organizationId),
  })

  const members = useMemo(
    () => combineMembers(membersQuery.data ?? [], pendingQuery.data ?? [])
      .filter((member) => member.organizacaoId === organizationId),
    [membersQuery.data, organizationId, pendingQuery.data],
  )
  const visibleMembers = useMemo(
    () => filterMembers(members, filter, search),
    [filter, members, search],
  )
  const pendingCount = pendingQuery.data?.length ?? members.filter((member) => member.status === 'PENDENTE').length
  const activeAdminCount = members.filter((member) => member.status === 'ATIVO' && member.perfil === 'ADMIN').length

  const mutation = useMutation({
    mutationFn: async ({ action: requestedAction, member, profile }: TeamMutationRequest) => {
      if (!organizationId) throw new Error('Organização não selecionada')
      if (requestedAction === 'approve') {
        if (profile !== 'OPERADOR' && profile !== 'CONSULTA') throw new Error('Perfil inválido')
        return teamService.approve(organizationId, member.id, profile)
      }
      if (requestedAction === 'profile') {
        if (!profile) throw new Error('Perfil inválido')
        return teamService.updateProfile(organizationId, member.id, profile)
      }
      return teamService.remove(organizationId, member.id)
    },
    onSuccess: async (_result, request) => {
      setFeedback(request.action === 'approve'
        ? 'Acesso aprovado.'
        : request.action === 'profile' ? 'Perfil atualizado.' : 'Acesso removido.')
      setAction(null)
      setSelectedMember(null)
      if (!organizationId) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamKeys.members(organizationId) }),
        queryClient.invalidateQueries({ queryKey: teamKeys.pending(organizationId) }),
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
      ])
    },
  })

  const openAction = (requestedAction: TeamAction, member: OrganizationMember) => {
    mutation.reset()
    setSelectedMember(member)
    setAction(requestedAction)
  }

  if (membersQuery.isLoading || pendingQuery.isLoading) {
    return <FeedbackState type="loading" title="Carregando equipe" message="Consultando os acessos deste ambiente." />
  }
  if (membersQuery.error || pendingQuery.error) {
    return (
      <FeedbackState
        type="error"
        title="Não foi possível carregar a equipe."
        message="Tente novamente em instantes."
        actionLabel="Tentar novamente"
        onAction={() => void Promise.all([membersQuery.refetch(), pendingQuery.refetch()])}
      />
    )
  }

  const hasSearch = Boolean(search.trim())
  const filters: TeamFilter[] = ['all', 'active', 'pending']

  return (
    <div className="team-page">
      <header className="team-page__heading"><h1>Equipe</h1></header>

      {feedback && (
        <div className="team-toast" role="status">
          <span>{feedback}</span>
          <button className="icon-button" onClick={() => setFeedback(null)} aria-label="Fechar mensagem"><X size={17} /></button>
        </div>
      )}

      <div className={`team-pending-summary${pendingCount > 0 ? ' team-pending-summary--attention' : ''}`} role="status">
        <span>{pendingCount > 0
          ? `${pendingCount} ${pendingCount === 1 ? 'pessoa aguarda' : 'pessoas aguardam'} aprovação.`
          : 'Nenhum acesso aguardando aprovação.'}</span>
        {pendingCount > 0 && <Button variant="ghost" onClick={() => setFilter('pending')}>Ver solicitações</Button>}
      </div>

      <div className="team-search">
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="team-search">Buscar na equipe</label>
        <input
          id="team-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou e-mail"
          autoComplete="off"
        />
        {search && <button className="icon-button" onClick={() => setSearch('')} aria-label="Limpar busca"><X size={18} /></button>}
      </div>

      <div className="team-filter-bar">
        <div className="team-filters" aria-label="Filtrar equipe">
          {filters.map((item) => (
            <button
              key={item}
              className={filter === item ? 'team-filter team-filter--active' : 'team-filter'}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {teamFilterLabels[item]}{item === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <span className="team-result-count" role="status">{visibleMembers.length} {visibleMembers.length === 1 ? 'pessoa' : 'pessoas'}</span>
      </div>

      {members.length === 0 ? (
        <div className="team-empty" role="status"><p>Nenhum membro neste ambiente.</p></div>
      ) : visibleMembers.length === 0 ? (
        <div className="team-empty" role="status">
          <p>{hasSearch ? `Nenhum resultado para “${search.trim()}”.` : 'Nenhuma pessoa neste filtro.'}</p>
          <Button variant="ghost" onClick={() => hasSearch ? setSearch('') : setFilter('all')}>{hasSearch ? 'Limpar busca' : 'Limpar filtros'}</Button>
        </div>
      ) : (
        <section className="team-list" aria-label="Membros deste ambiente">
          <div className="team-list__header" aria-hidden="true">
            <span>Nome</span><span>E-mail</span><span>Perfil</span><span>Situação</span><span>Ação</span>
          </div>
          {visibleMembers.map((member) => (
            <article className="team-row" key={member.id} aria-label={`${member.usuarioNome}, ${profileLabels[member.perfil]}`}>
              <strong className="team-row__name">{member.usuarioNome}{member.usuarioId === account?.id ? <small>Você</small> : null}</strong>
              <span className="team-row__email">{member.usuarioEmail}</span>
              <span className="team-row__profile" data-label="Perfil">{profileLabels[member.perfil]}</span>
              <span className={`team-status team-status--${member.status.toLowerCase()}`} data-label="Situação">{memberStatusLabels[member.status]}</span>
              <div className="team-row__actions">
                {member.status === 'PENDENTE' ? (
                  <Button onClick={() => openAction('approve', member)}>Aprovar</Button>
                ) : member.status === 'ATIVO' ? (
                  member.perfil === 'ADMIN' && activeAdminCount === 1
                    ? <span className="team-row__protected">Último administrador</span>
                    : <>
                      <Button variant="secondary" onClick={() => openAction('profile', member)}>Alterar perfil</Button>
                      <Button variant="ghost" onClick={() => openAction('remove', member)}>Remover</Button>
                    </>
                ) : <span>—</span>}
              </div>
            </article>
          ))}
        </section>
      )}

      <TeamActionDialog
        action={action}
        member={selectedMember}
        pending={mutation.isPending}
        error={teamError(mutation.error)}
        onClose={() => { if (!mutation.isPending) { setAction(null); setSelectedMember(null); mutation.reset() } }}
        onSubmit={(profile) => {
          if (!action || !selectedMember) return
          void mutation.mutateAsync({ action, member: selectedMember, profile }).catch(() => undefined)
        }}
      />
    </div>
  )
}
