import { Button } from '../Button'
import { Dialog } from '../Dialog'
import type { UnifiedMovement } from '../../lib/operations-ui'

export function ConfirmMovementDialog({
  movement,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  movement: UnifiedMovement | null
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={Boolean(movement)} title="Confirmar movimentação?" onClose={onClose}>
      <div className="dialog-form">
        {movement && <p className="operations-confirmation-item"><strong>{movement.subjectName}</strong><span>{movement.typeLabel}</span></p>}
        {error && <p className="form-alert" role="alert">{error}</p>}
        <div className="dialog-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Não</Button>
          <Button type="button" onClick={onConfirm} loading={pending}>Sim</Button>
        </div>
      </div>
    </Dialog>
  )
}
