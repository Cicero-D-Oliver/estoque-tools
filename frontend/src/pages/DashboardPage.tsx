import { useQuery } from '@tanstack/react-query'
import { Activity, Boxes, Clock3, PackageCheck, UserRound } from 'lucide-react'
import { FeedbackState } from '../components/FeedbackState'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError } from '../lib/api-client'
import { formatDateTime } from '../lib/format'
import { useAuth } from '../providers/AuthProvider'
import { useOrganization } from '../providers/OrganizationProvider'
import { loadDashboard } from '../services/dashboard-service'

const movementLabels: Record<string, string> = {
  RETIRADA: 'Retirada registrada',
  DEVOLUCAO: 'Devolução registrada',
  TRANSFERENCIA: 'Responsabilidade transferida',
  MANUTENCAO: 'Enviada para manutenção',
  PERDA: 'Perda registrada',
  CORRECAO: 'Estado corrigido',
}

export function DashboardPage() {
  const { account } = useAuth()
  const { selectedOrganization } = useOrganization()
  const query = useQuery({
    queryKey: ['dashboard', selectedOrganization?.id],
    queryFn: () => loadDashboard(selectedOrganization!.perfil),
    enabled: Boolean(selectedOrganization),
  })

  if (query.isLoading) {
    return <FeedbackState type="loading" title="Montando seu dashboard" message="Consolidando ferramentas e movimentações da organização." />
  }

  if (query.error) {
    const forbidden = query.error instanceof ApiError && query.error.status === 403
    return <FeedbackState type="error"
      title={forbidden ? 'Acesso não permitido' : 'Não foi possível carregar o dashboard'}
      message={forbidden ? 'Seu perfil não possui acesso a estes dados.' : 'Verifique a conexão e tente novamente.'}
      actionLabel="Tentar novamente" onAction={() => void query.refetch()} />
  }

  const tools = query.data?.tools ?? []
  const available = tools.filter((tool) => tool.ativo && tool.status === 'DISPONIVEL').length
  const borrowed = tools.filter((tool) => tool.ativo && tool.status === 'EMPRESTADA').length
  const recentMovements = query.data?.summary?.movimentacoes
    ?? [...(query.data?.movements ?? [])].sort((a, b) => b.id - a.id).slice(0, 6)
  const pending = query.data?.summary?.quantidadePendentes

  return (
    <div className="dashboard">
      <header className="page-heading page-heading--split">
        <div>
          <span className="eyebrow">{selectedOrganization?.nome}</span>
          <h1>Olá, {account?.nome.split(' ')[0]}</h1>
          <p>Acompanhe o que precisa de atenção na operação de hoje.</p>
        </div>
        {selectedOrganization && <StatusBadge status={selectedOrganization.perfil} />}
      </header>

      <section className="metric-grid" aria-label="Indicadores operacionais">
        <article className="metric-card">
          <span className="metric-card__icon"><Boxes /></span>
          <div><span>Ferramentas totais</span><strong>{tools.filter((tool) => tool.ativo).length}</strong></div>
        </article>
        <article className="metric-card">
          <span className="metric-card__icon metric-card__icon--success"><PackageCheck /></span>
          <div><span>Disponíveis</span><strong>{available}</strong></div>
        </article>
        <article className="metric-card">
          <span className="metric-card__icon metric-card__icon--warning"><UserRound /></span>
          <div><span>Em uso</span><strong>{borrowed}</strong></div>
        </article>
        <article className="metric-card">
          <span className="metric-card__icon metric-card__icon--attention"><Clock3 /></span>
          <div>
            <span>Confirmações pendentes</span>
            <strong>{pending ?? '—'}</strong>
            {pending === undefined && <small>Visível para ADMIN</small>}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel panel--activity">
          <header className="panel__header">
            <div><span className="eyebrow">Auditoria</span><h2>Movimentações recentes</h2></div>
            <Activity size={21} aria-hidden="true" />
          </header>
          {recentMovements.length === 0 ? (
            <FeedbackState type="empty" title="Nenhuma movimentação" message="Os eventos operacionais aparecerão aqui quando forem registrados." />
          ) : (
            <div className="activity-list">
              {recentMovements.map((movement) => (
                <div className="activity-row" key={movement.id}>
                  <span className={`activity-row__marker activity-row__marker--${movement.tipoMovimentacao.toLowerCase()}`} aria-hidden="true" />
                  <div>
                    <strong>{movementLabels[movement.tipoMovimentacao]}</strong>
                    <span>{movement.ferramentaNome} · {movement.ferramentaPatrimonio}</span>
                  </div>
                  <div className="activity-row__meta">
                    <span>{movement.usuarioNome}</span>
                    <time dateTime={movement.dataHora}>{formatDateTime(movement.dataHora)}</time>
                  </div>
                  <StatusBadge status={movement.statusRevisao} />
                </div>
              ))}
            </div>
          )}
        </article>

        <aside className="panel panel--context">
          <span className="eyebrow">Área de apoio</span>
          <h2>Próximas ações</h2>
          <p>Este espaço receberá ações rápidas e pendências reais conforme os módulos operacionais forem implementados.</p>
          <div className="panel__future-note">Sem ações adicionais para esta fundação.</div>
        </aside>
      </section>
    </div>
  )
}
