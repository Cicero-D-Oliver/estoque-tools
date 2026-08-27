import { X } from 'lucide-react'
import { Button } from '../Button'
import { formatDateTime } from '../../lib/format'
import type { UnifiedMovement } from '../../lib/operations-ui'

export function MovementDetailsPanel({
  movement,
  canConfirm,
  onConfirm,
  onClose,
}: {
  movement: UnifiedMovement
  canConfirm: boolean
  onConfirm: (movement: UnifiedMovement) => void
  onClose: () => void
}) {
  return (
    <div className="operations-drawer-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside className="operations-drawer" role="dialog" aria-modal="true" aria-labelledby="movement-details-title">
        <header className="operations-drawer__header">
          <div>
            <span>{movement.source === 'tool' ? 'Ferramenta' : 'Estoque'}</span>
            <h2 id="movement-details-title">{movement.typeLabel}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={20} /></button>
        </header>
        <div className="operations-drawer__content">
          <p className="operations-drawer__sentence">{movement.sentence}</p>
          <dl className="operations-details">
            <dt>Data e hora</dt><dd>{formatDateTime(movement.occurredAt)}</dd>
            <dt>{movement.source === 'tool' ? 'Ferramenta' : 'Item'}</dt>
            <dd>{movement.subjectName}{movement.subjectCode ? ` · ${movement.subjectCode}` : ''}</dd>
            <dt>Executor</dt><dd>{movement.executor}</dd>
            {movement.previousResponsible && <><dt>Responsável anterior</dt><dd>{movement.previousResponsible}</dd></>}
            {movement.responsible && <><dt>Novo responsável</dt><dd>{movement.responsible}</dd></>}
            {movement.source === 'stock' && <><dt>Quantidade</dt><dd>{movement.operationalResult}</dd></>}
            <dt>Destino</dt><dd>{movement.destination || '—'}</dd>
            <dt>Observação</dt><dd>{movement.observation || '—'}</dd>
            {movement.reviewStatus && (
              <><dt>Conferência</dt><dd>{movement.reviewStatus === 'PENDENTE' ? 'Aguardando confirmação do admin.' : 'Confirmada'}</dd></>
            )}
            {movement.confirmedBy && <><dt>Confirmada por</dt><dd>{movement.confirmedBy}</dd></>}
            {movement.confirmedAt && <><dt>Confirmada em</dt><dd>{formatDateTime(movement.confirmedAt)}</dd></>}
          </dl>
          {canConfirm && (
            <div className="operations-details__actions">
              <Button onClick={() => onConfirm(movement)}>Confirmar movimentação</Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
