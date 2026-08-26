import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { FeedbackState } from '../components/FeedbackState'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError } from '../lib/api-client'
import { formatDateTime } from '../lib/format'
import { useAuth } from '../providers/AuthProvider'
import { useOrganization } from '../providers/OrganizationProvider'
import { loadDashboard } from '../services/dashboard-service'
import type { Tool, ToolMovement } from '../types/api'

const RECENT_MOVEMENT_LIMIT = 6

const movementTypeLabels: Record<ToolMovement['tipoMovimentacao'], string> = {
  RETIRADA: 'Retirada',
  DEVOLUCAO: 'Devolução',
  TRANSFERENCIA: 'Transferência',
  MANUTENCAO: 'Manutenção',
  PERDA: 'Perda',
  CORRECAO: 'Correção',
}

function movementSentence(movement: ToolMovement): string {
  const tool = `${movement.ferramentaNome} ${movement.ferramentaPatrimonio}`

  switch (movement.tipoMovimentacao) {
    case 'RETIRADA':
      return `${movement.responsavelUsuarioNome ?? movement.usuarioNome} retirou ${tool}`
    case 'DEVOLUCAO':
      return `${movement.usuarioNome} devolveu ${tool}`
    case 'TRANSFERENCIA':
      return `${movement.usuarioNome} transferiu ${tool}${movement.responsavelUsuarioNome ? ` para ${movement.responsavelUsuarioNome}` : ''}`
    case 'MANUTENCAO':
      return `${movement.usuarioNome} enviou ${tool} para manutenção`
    case 'PERDA':
      return `Perda registrada para ${tool}`
    case 'CORRECAO':
      return `${movement.usuarioNome} corrigiu o estado de ${tool}`
  }
}

function countMessage(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function sortByOldestResponsibility(tools: Tool[]): Tool[] {
  return [...tools].sort((left, right) => {
    if (!left.responsavelDesde) return 1
    if (!right.responsavelDesde) return -1
    return new Date(left.responsavelDesde).getTime() - new Date(right.responsavelDesde).getTime()
  })
}

function CompactEmpty({ children }: { children: React.ReactNode }) {
  return <p className="compact-empty" role="status">{children}</p>
}

function ToolUseList({ tools, personal = false }: { tools: Tool[]; personal?: boolean }) {
  return (
    <div className="tool-use-list">
      {sortByOldestResponsibility(tools).map((tool) => {
        const inconsistent = !tool.responsavelAtualNome
        return (
          <article className={`tool-use-row${inconsistent ? ' tool-use-row--inconsistent' : ''}`} key={tool.id}>
            <div className="tool-use-row__identity">
              <strong>{tool.nome}</strong>
              <span>{tool.patrimonio}</span>
            </div>
            <div className="tool-use-row__responsibility">
              <span>{personal ? 'Sob sua responsabilidade' : inconsistent ? 'Responsável não informado' : `Com ${tool.responsavelAtualNome}`}</span>
              {inconsistent && <small>Verificar inconsistência operacional</small>}
            </div>
            <div className="tool-use-row__context">
              <span>{tool.destinoAtual || 'Destino não informado'}</span>
              <time dateTime={tool.responsavelDesde ?? undefined}>
                {tool.responsavelDesde
                  ? `Retirada em ${formatDateTime(tool.responsavelDesde)}`
                  : 'Horário da retirada não informado'}
              </time>
            </div>
          </article>
        )
      })}
    </div>
  )
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
    return <FeedbackState type="loading" title="Carregando a situação do almoxarifado" message="Buscando ferramentas, responsáveis e pendências." />
  }

  if (query.error) {
    const forbidden = query.error instanceof ApiError && query.error.status === 403
    return <FeedbackState type="error"
      title={forbidden ? 'Você não tem acesso a este almoxarifado' : 'Não foi possível atualizar a situação do almoxarifado'}
      message={forbidden ? 'Confirme a organização selecionada ou fale com um administrador.' : 'Verifique a conexão e tente novamente.'}
      actionLabel="Tentar novamente" onAction={() => void query.refetch()} />
  }

  const data = query.data
  const tools = data?.tools ?? []
  const borrowedTools = data?.borrowedTools ?? []
  const pendingMovements = data?.pendingMovements ?? []
  const lowStockItems = data?.lowStockItems ?? []
  const activeTools = tools.filter((tool) => tool.ativo)
  const available = activeTools.filter((tool) => tool.status === 'DISPONIVEL').length
  const maintenance = activeTools.filter((tool) => tool.status === 'MANUTENCAO').length
  const lost = activeTools.filter((tool) => tool.status === 'PERDIDA').length
  const recentMovements = (data?.movements ?? []).slice(0, RECENT_MOVEMENT_LIMIT)
  const isAdmin = selectedOrganization?.perfil === 'ADMIN'
  const isOperator = selectedOrganization?.perfil === 'OPERADOR'
  const assignedToAccount = isOperator && account
    ? borrowedTools.filter((tool) => tool.responsavelAtualId === account.id)
    : []

  const attentionItems = [
    ...(isAdmin && pendingMovements.length > 0 ? [{
      tone: 'pending',
      text: `${countMessage(pendingMovements.length, 'movimentação aguarda', 'movimentações aguardam')} conferência`,
    }] : []),
    ...(lost > 0 ? [{
      tone: 'danger',
      text: countMessage(lost, 'ferramenta está marcada como perdida', 'ferramentas estão marcadas como perdidas'),
    }] : []),
    ...(maintenance > 0 ? [{
      tone: 'warning',
      text: countMessage(maintenance, 'ferramenta está em manutenção', 'ferramentas estão em manutenção'),
    }] : []),
    ...(lowStockItems.length > 0 ? [{
      tone: 'stock',
      text: `${countMessage(lowStockItems.length, 'item está', 'itens estão')} abaixo do mínimo`,
    }] : []),
  ]

  return (
    <div className="dashboard">
      <header className="dashboard-heading">
        <div className="dashboard-heading__identity">
          <h1 title={selectedOrganization?.nome}>{selectedOrganization?.nome}</h1>
          <p>Olá, {account?.nome.split(' ')[0]}.</p>
        </div>
        {isAdmin && pendingMovements.length > 0 && (
          <div
            className="dashboard-heading__pending"
            role="status"
            aria-label={`${countMessage(pendingMovements.length, 'pendência aguarda', 'pendências aguardam')} conferência`}
          >
            <Bell size={18} aria-hidden="true" />
            <strong>{pendingMovements.length}</strong>
            <span>{pendingMovements.length === 1 ? 'pendência' : 'pendências'}</span>
          </div>
        )}
      </header>

      <section className="dashboard-summary" aria-label="Resumo operacional">
        <div className="dashboard-summary__item"><strong>{activeTools.length}</strong><span>Ferramentas ativas</span></div>
        <div className="dashboard-summary__item"><strong>{available}</strong><span>Disponíveis</span></div>
        <div className="dashboard-summary__item"><strong>{borrowedTools.length}</strong><span>Em uso</span></div>
        {isAdmin && (
          <div className="dashboard-summary__item dashboard-summary__item--attention">
            <strong>{pendingMovements.length}</strong><span>Aguardam conferência</span>
          </div>
        )}
      </section>

      <section className="operational-section attention-section" aria-labelledby="attention-heading">
        <header className="operational-section__header">
          <h2 id="attention-heading">Atenção agora</h2>
        </header>
        {attentionItems.length === 0 ? (
          <CompactEmpty>Tudo conferido por enquanto.</CompactEmpty>
        ) : (
          <ul className="attention-list">
            {attentionItems.map((item) => (
              <li className={`attention-row attention-row--${item.tone}`} key={item.tone}>
                <span aria-hidden="true" />
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      {assignedToAccount.length > 0 && (
        <section className="operational-section personal-tools" aria-labelledby="personal-tools-heading">
          <header className="operational-section__header">
            <h2 id="personal-tools-heading">Com você</h2>
          </header>
          <ToolUseList tools={assignedToAccount} personal />
        </section>
      )}

      <div className={`dashboard-operational-grid${isAdmin ? '' : ' dashboard-operational-grid--single'}`}>
        <section className="operational-section tools-in-use" aria-labelledby="tools-in-use-heading">
          <header className="operational-section__header">
            <h2 id="tools-in-use-heading">Ferramentas em uso</h2>
            <span className="section-count">{borrowedTools.length}</span>
          </header>
          {borrowedTools.length === 0 ? (
            <CompactEmpty>Todas as ferramentas estão no almoxarifado.</CompactEmpty>
          ) : (
            <ToolUseList tools={borrowedTools} />
          )}
        </section>

        {isAdmin && (
          <section className="operational-section pending-review" aria-labelledby="pending-review-heading">
            <header className="operational-section__header">
              <h2 id="pending-review-heading">Aguardando conferência</h2>
              <span className="section-count section-count--attention">{pendingMovements.length}</span>
            </header>
            {pendingMovements.length === 0 ? (
              <CompactEmpty>Tudo conferido por enquanto.</CompactEmpty>
            ) : (
              <div className="pending-list">
                {pendingMovements.map((movement) => (
                  <article className="pending-row" key={movement.id}>
                    <div className="pending-row__title">
                      <strong>{movementTypeLabels[movement.tipoMovimentacao]}</strong>
                      <span>{movement.ferramentaNome} · {movement.ferramentaPatrimonio}</span>
                    </div>
                    <p>Registrada por {movement.usuarioNome}</p>
                    {movement.responsavelUsuarioNome && <p>Responsável: {movement.responsavelUsuarioNome}</p>}
                    {movement.destino && <p>Destino: {movement.destino}</p>}
                    {movement.observacao && <p className="pending-row__observation">{movement.observacao}</p>}
                    <time dateTime={movement.dataHora}>{formatDateTime(movement.dataHora)}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <section className="operational-section recent-records" aria-labelledby="recent-records-heading">
        <header className="operational-section__header">
          <h2 id="recent-records-heading">Últimos registros</h2>
        </header>
        {recentMovements.length === 0 ? (
          <CompactEmpty>Ainda não houve movimentações nesta organização.</CompactEmpty>
        ) : (
          <div className="record-list">
            {recentMovements.map((movement) => (
              <article className="record-row" key={movement.id}>
                <span className={`record-row__marker record-row__marker--${movement.tipoMovimentacao.toLowerCase()}`} aria-hidden="true" />
                <div className="record-row__content">
                  <strong>{movementSentence(movement)}</strong>
                  <span>
                    {movement.destino ? `${movement.destino} · ` : ''}
                    {movement.observacao || movementTypeLabels[movement.tipoMovimentacao]}
                  </span>
                </div>
                <time dateTime={movement.dataHora}>{formatDateTime(movement.dataHora)}</time>
                {movement.statusRevisao === 'PENDENTE' && <StatusBadge status="PENDENTE" />}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
