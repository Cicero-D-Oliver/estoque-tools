import { X } from 'lucide-react'
import type { Account, MemberProfile, Tool, ToolMovement } from '../../types/api'
import { formatOperationalDateTime } from '../../lib/format'
import {
  canOperate,
  canTransfer,
  movementSentence,
  primaryToolAction,
  toolCurrentLocation,
  toolStatusLabel,
  toolStatusTone,
  type ToolAction,
} from '../../lib/tool-ui'
import { Button } from '../Button'

interface ToolDetailsPanelProps {
  tool: Tool
  profile: MemberProfile
  account: Account | null
  history?: ToolMovement[]
  historyLoading: boolean
  historyError: boolean
  onRetryHistory: () => void
  onClose: () => void
  onAction: (action: ToolAction, tool: Tool) => void
}

const actionLabels: Partial<Record<ToolAction, string>> = {
  withdraw: 'Retirar',
  return: 'Devolver',
  transfer: 'Transferir',
  maintenance: 'Enviar para manutenção',
  'complete-maintenance': 'Concluir manutenção',
  loss: 'Registrar perda',
}

function OperationalActions({
  tool,
  profile,
  account,
  onAction,
}: Pick<ToolDetailsPanelProps, 'tool' | 'profile' | 'account' | 'onAction'>) {
  if (!canOperate(profile) || !tool.ativo) return null
  const primary = primaryToolAction(tool, profile)
  const secondary: ToolAction[] = []

  if (tool.status === 'EMPRESTADA' && canTransfer(profile, account, tool)) secondary.push('transfer')
  if (tool.status === 'DISPONIVEL' || tool.status === 'EMPRESTADA') secondary.push('maintenance')
  if (tool.status !== 'PERDIDA') secondary.push('loss')

  return (
    <section className="tool-details__actions" aria-labelledby="tool-actions-heading">
      <h3 id="tool-actions-heading">Ações operacionais</h3>
      <div>
        {primary && (
          <Button onClick={() => onAction(primary, tool)}>
            {actionLabels[primary]}
          </Button>
        )}
        {secondary.map((action) => (
          <Button key={action} variant={action === 'loss' ? 'danger' : 'secondary'} onClick={() => onAction(action, tool)}>
            {actionLabels[action]}
          </Button>
        ))}
      </div>
    </section>
  )
}

function MovementRow({ movement }: { movement: ToolMovement }) {
  return (
    <li className="tool-history__item">
      <div>
        <strong>{movementSentence(movement)}</strong>
        <time dateTime={movement.dataHora}>{formatOperationalDateTime(movement.dataHora)}</time>
      </div>
      {movement.destino && <span>Destino: {movement.destino}</span>}
      {movement.observacao && <p>{movement.observacao}</p>}
    </li>
  )
}

export function ToolDetailsPanel({
  tool,
  profile,
  account,
  history,
  historyLoading,
  historyError,
  onRetryHistory,
  onClose,
  onAction,
}: ToolDetailsPanelProps) {
  const orderedHistory = [...(history ?? [])].sort((left, right) => {
    const dateDifference = new Date(right.dataHora).getTime() - new Date(left.dataHora).getTime()
    return dateDifference || right.id - left.id
  })
  const latestMovement = orderedHistory[0]

  return (
    <div className="tool-drawer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside className="tool-drawer" role="dialog" aria-modal="true" aria-labelledby="tool-details-title">
        <header className="tool-drawer__header">
          <div>
            <span>{tool.patrimonio}</span>
            <h2 id="tool-details-title">{tool.nome}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar detalhes" autoFocus>
            <X size={20} />
          </button>
        </header>

        <div className="tool-drawer__content">
          <span className={`tool-status tool-status--${toolStatusTone(tool)}`}>{toolStatusLabel(tool)}</span>
          <dl className="tool-details">
            {tool.categoria && <><dt>Categoria</dt><dd>{tool.categoria}</dd></>}
            <dt>Responsável atual</dt><dd>{tool.responsavelAtualNome ? `Com ${tool.responsavelAtualNome}` : '—'}</dd>
            <dt>Onde está</dt><dd>{toolCurrentLocation(tool)}</dd>
            <dt>Responsável desde</dt>
            <dd>{tool.status === 'EMPRESTADA' ? formatOperationalDateTime(tool.responsavelDesde) : '—'}</dd>
            <dt>Local de guarda</dt><dd>{tool.localizacao || 'Não informado'}</dd>
            <dt>Cadastro</dt><dd>{tool.ativo ? 'Ativo' : 'Inativo'}</dd>
            <dt>Última movimentação</dt>
            <dd>{latestMovement
              ? `${movementSentence(latestMovement)} · ${formatOperationalDateTime(latestMovement.dataHora)}`
              : historyLoading ? 'Carregando…' : 'Nenhuma movimentação registrada'}</dd>
          </dl>

          <OperationalActions tool={tool} profile={profile} account={account} onAction={onAction} />

          {profile === 'ADMIN' && (
            <section className="tool-details__actions tool-details__actions--administrative" aria-labelledby="tool-admin-actions-heading">
              <h3 id="tool-admin-actions-heading">Cadastro</h3>
              <div>
                <Button variant="secondary" onClick={() => onAction('edit', tool)}>Editar</Button>
                {tool.ativo && tool.status !== 'EMPRESTADA' && (
                  <Button variant="danger" onClick={() => onAction('inactivate', tool)}>Inativar</Button>
                )}
                {tool.ativo && (
                  <Button variant="ghost" onClick={() => onAction('correction', tool)}>Corrigir estado</Button>
                )}
              </div>
            </section>
          )}

          <section className="tool-history" aria-labelledby="tool-history-heading">
            <header>
              <h3 id="tool-history-heading">Histórico</h3>
            </header>
            {historyLoading && <p className="tool-history__state" role="status">Carregando histórico…</p>}
            {historyError && (
              <div className="tool-history__state" role="alert">
                <p>Não foi possível carregar o histórico.</p>
                <Button variant="secondary" onClick={onRetryHistory}>Tentar novamente</Button>
              </div>
            )}
            {!historyLoading && !historyError && orderedHistory.length === 0 && (
              <p className="tool-history__state">Nenhuma movimentação registrada.</p>
            )}
            {!historyLoading && !historyError && orderedHistory.length > 0 && (
              <ol className="tool-history__list">
                {orderedHistory.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
