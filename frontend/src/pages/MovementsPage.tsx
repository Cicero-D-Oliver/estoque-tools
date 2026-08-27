import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { FeedbackState } from '../components/FeedbackState'
import { ConfirmMovementDialog } from '../components/operations/ConfirmMovementDialog'
import { MovementDetailsPanel } from '../components/operations/MovementDetailsPanel'
import { ApiError } from '../lib/api-client'
import { formatDateTime } from '../lib/format'
import {
  combineMovements,
  filterMovements,
  movementFilterLabels,
  type MovementFilter,
  type UnifiedMovement,
} from '../lib/operations-ui'
import { useOrganization } from '../providers/OrganizationProvider'
import { movementKeys, movementService } from '../services/movement-service'
import type { ToolMovement } from '../types/api'

function confirmationError(error: Error | null): string | undefined {
  if (!error) return undefined
  if (!(error instanceof ApiError)) return 'Não foi possível confirmar a movimentação.'
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
  if (error.status === 403) return 'Você não tem permissão para esta ação.'
  if (error.status === 409) return 'Os dados foram alterados. Atualize a tela.'
  return 'Não foi possível confirmar a movimentação.'
}

function mergeToolMovements(history: ToolMovement[], pending: ToolMovement[]): ToolMovement[] {
  const byId = new Map(history.map((movement) => [movement.id, movement]))
  pending.forEach((movement) => byId.set(movement.id, movement))
  return [...byId.values()]
}

function MovementRow({
  movement,
  admin,
  onOpen,
  onConfirm,
}: {
  movement: UnifiedMovement
  admin: boolean
  onOpen: (movement: UnifiedMovement) => void
  onConfirm: (movement: UnifiedMovement) => void
}) {
  const pending = movement.reviewStatus === 'PENDENTE'
  const openWithKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onOpen(movement)
    }
  }

  return (
    <article
      className="movement-row"
      aria-label={`Abrir detalhes: ${movement.sentence}`}
      tabIndex={0}
      onClick={() => onOpen(movement)}
      onKeyDown={openWithKeyboard}
    >
      <time dateTime={movement.occurredAt}>{formatDateTime(movement.occurredAt)}</time>
      <div className="movement-row__event">
        <strong>{movement.typeLabel}</strong>
        <span>{movement.subjectName}{movement.subjectCode ? ` · ${movement.subjectCode}` : ''}</span>
      </div>
      <span className="movement-row__executor" data-label="Executor">{movement.executor}</span>
      <span className="movement-row__result" data-label="Resultado">{movement.operationalResult}</span>
      <span className="movement-row__destination" data-label="Destino">{movement.destination || '—'}</span>
      <span
        className={`movement-review movement-review--${movement.reviewStatus?.toLowerCase() ?? 'not-applicable'}`}
        data-label="Conferência"
      >
        {movement.reviewStatus === 'PENDENTE' ? 'Aguardando confirmação do admin.' : movement.reviewStatus === 'CONFIRMADA' ? 'Confirmada' : '—'}
      </span>
      <div className="movement-row__actions" onClick={(event) => event.stopPropagation()}>
        {admin && pending
          ? <Button onClick={() => onConfirm(movement)}>Confirmar</Button>
          : <Button variant="ghost" onClick={() => onOpen(movement)}>Detalhes</Button>}
      </div>
    </article>
  )
}

export function MovementsPage() {
  const queryClient = useQueryClient()
  const { selectedOrganization } = useOrganization()
  const organizationId = selectedOrganization?.id
  const admin = selectedOrganization?.perfil === 'ADMIN'
  const [filter, setFilter] = useState<MovementFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<UnifiedMovement | null>(null)
  const [confirming, setConfirming] = useState<UnifiedMovement | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setFilter('all')
    setSearch('')
    setSelected(null)
    setConfirming(null)
    setFeedback(null)
  }, [organizationId])

  const toolsQuery = useQuery({
    queryKey: organizationId ? movementKeys.tools(organizationId) : movementKeys.all,
    queryFn: movementService.listTools,
    enabled: Boolean(organizationId),
  })
  const stockQuery = useQuery({
    queryKey: organizationId ? movementKeys.stock(organizationId) : [...movementKeys.all, 'stock'],
    queryFn: movementService.listStock,
    enabled: Boolean(organizationId),
  })
  const pendingQuery = useQuery({
    queryKey: organizationId ? movementKeys.pending(organizationId) : [...movementKeys.all, 'pending'],
    queryFn: movementService.listPending,
    enabled: Boolean(organizationId && admin),
  })

  const movements = useMemo(() => combineMovements(
    mergeToolMovements(toolsQuery.data ?? [], pendingQuery.data ?? []),
    stockQuery.data ?? [],
  ), [pendingQuery.data, stockQuery.data, toolsQuery.data])
  const visibleMovements = useMemo(
    () => filterMovements(movements, filter, search),
    [filter, movements, search],
  )
  const pendingCount = pendingQuery.data?.length
    ?? movements.filter((movement) => movement.reviewStatus === 'PENDENTE').length

  const confirmation = useMutation({
    mutationFn: (movementId: number) => movementService.confirm(movementId),
    onSuccess: async () => {
      setFeedback('Movimentação confirmada.')
      setConfirming(null)
      setSelected(null)
      if (!organizationId) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: movementKeys.tools(organizationId) }),
        queryClient.invalidateQueries({ queryKey: movementKeys.pending(organizationId) }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] }),
      ])
    },
  })

  if (toolsQuery.isLoading || stockQuery.isLoading || (admin && pendingQuery.isLoading)) {
    return <FeedbackState type="loading" title="Carregando movimentações" message="Consultando o histórico operacional." />
  }
  if (toolsQuery.error || stockQuery.error) {
    return (
      <FeedbackState
        type="error"
        title="Não foi possível carregar as movimentações."
        message="Tente novamente em instantes."
        actionLabel="Tentar novamente"
        onAction={() => void Promise.all([toolsQuery.refetch(), stockQuery.refetch()])}
      />
    )
  }

  const filters: MovementFilter[] = admin
    ? ['all', 'tools', 'stock', 'pending', 'confirmed']
    : ['all', 'tools', 'stock']
  const hasSearch = Boolean(search.trim())

  return (
    <div className="operations-page">
      <header className="operations-page__heading"><h1>Movimentações</h1></header>

      {feedback && (
        <div className="operations-toast" role="status">
          <span>{feedback}</span>
          <button className="icon-button" onClick={() => setFeedback(null)} aria-label="Fechar mensagem"><X size={17} /></button>
        </div>
      )}

      {admin && (
        <div className={`operations-pending-summary${pendingCount > 0 ? ' operations-pending-summary--attention' : ''}`} role="status">
          <span>{pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? 'movimentação aguardando' : 'movimentações aguardando'} confirmação do admin.`
            : 'Sem novas movimentações'}</span>
          {pendingCount > 0 && <Button variant="ghost" onClick={() => setFilter('pending')}>Ver pendentes</Button>}
        </div>
      )}
      {admin && pendingQuery.isError && (
        <div className="operations-inline-warning" role="status">Não foi possível atualizar as pendências administrativas.</div>
      )}

      <div className="operations-search">
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="movement-search">Buscar movimentações</label>
        <input
          id="movement-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por item, patrimônio, pessoa ou destino"
          autoComplete="off"
        />
        {search && <button className="icon-button" onClick={() => setSearch('')} aria-label="Limpar busca"><X size={18} /></button>}
      </div>

      <div className="operations-filter-bar">
        <div className="operations-filters" aria-label="Filtrar movimentações">
          {filters.map((item) => (
            <button
              key={item}
              className={filter === item ? 'operations-filter operations-filter--active' : 'operations-filter'}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {movementFilterLabels[item]}{item === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <span className="operations-result-count" role="status">{visibleMovements.length} {visibleMovements.length === 1 ? 'registro' : 'registros'}</span>
      </div>

      {movements.length === 0 ? (
        <div className="operations-empty" role="status"><p>Nenhuma movimentação registrada.</p></div>
      ) : visibleMovements.length === 0 ? (
        <div className="operations-empty" role="status">
          <p>{hasSearch ? `Nenhum resultado para “${search.trim()}”.` : filter === 'pending' ? 'Sem novas movimentações' : 'Nenhuma movimentação neste filtro.'}</p>
          <Button variant="ghost" onClick={() => hasSearch ? setSearch('') : setFilter('all')}>{hasSearch ? 'Limpar busca' : 'Limpar filtros'}</Button>
        </div>
      ) : (
        <section className="operations-list" aria-label="Histórico de movimentações">
          <div className="operations-list__header" aria-hidden="true">
            <span>Data</span><span>Movimentação</span><span>Executor</span><span>Resultado</span>
            <span>Destino</span><span>Conferência</span><span>Ação</span>
          </div>
          {visibleMovements.map((movement) => (
            <MovementRow
              key={movement.key}
              movement={movement}
              admin={admin}
              onOpen={setSelected}
              onConfirm={(item) => { confirmation.reset(); setConfirming(item) }}
            />
          ))}
        </section>
      )}

      {selected && !confirming && (
        <MovementDetailsPanel
          movement={selected}
          canConfirm={admin && selected.reviewStatus === 'PENDENTE'}
          onConfirm={(item) => { confirmation.reset(); setConfirming(item) }}
          onClose={() => setSelected(null)}
        />
      )}
      <ConfirmMovementDialog
        movement={confirming}
        pending={confirmation.isPending}
        error={confirmationError(confirmation.error)}
        onClose={() => { if (!confirmation.isPending) { setConfirming(null); confirmation.reset() } }}
        onConfirm={() => { if (confirming) void confirmation.mutateAsync(confirming.id).catch(() => undefined) }}
      />
    </div>
  )
}
