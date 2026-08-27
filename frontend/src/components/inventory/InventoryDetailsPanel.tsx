import { X } from 'lucide-react'
import { formatDateTime } from '../../lib/format'
import {
  canWriteStock,
  inventoryStatus,
  inventoryStatusLabel,
  stockMovementSentence,
  type InventoryAction,
} from '../../lib/inventory-ui'
import type { MemberProfile, StockItem, StockMovement } from '../../types/api'
import { Button } from '../Button'

interface InventoryDetailsPanelProps {
  item: StockItem
  profile: MemberProfile
  officialLowStockIds: ReadonlySet<number>
  history?: StockMovement[]
  historyLoading: boolean
  historyError: boolean
  onRetryHistory: () => void
  onClose: () => void
  onAction: (action: InventoryAction, item: StockItem) => void
}

function MovementRow({ movement }: { movement: StockMovement }) {
  return (
    <li className="inventory-history__item">
      <div>
        <strong>{stockMovementSentence(movement)}</strong>
        <time dateTime={movement.dataHora}>{formatDateTime(movement.dataHora)}</time>
      </div>
      <span>Por {movement.usuarioNome}</span>
      {movement.observacao && <p>{movement.observacao}</p>}
    </li>
  )
}

export function InventoryDetailsPanel({
  item,
  profile,
  officialLowStockIds,
  history,
  historyLoading,
  historyError,
  onRetryHistory,
  onClose,
  onAction,
}: InventoryDetailsPanelProps) {
  const status = inventoryStatus(item, officialLowStockIds)
  const orderedHistory = [...(history ?? [])].sort((left, right) => {
    const dateDifference = new Date(right.dataHora).getTime() - new Date(left.dataHora).getTime()
    return dateDifference || right.id - left.id
  })

  return (
    <div className="inventory-drawer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside className="inventory-drawer" role="dialog" aria-modal="true" aria-labelledby="inventory-details-title">
        <header className="inventory-drawer__header">
          <div><span>{item.codigo}</span><h2 id="inventory-details-title">{item.nome}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar detalhes" autoFocus><X size={20} /></button>
        </header>

        <div className="inventory-drawer__content">
          <span className={`inventory-status inventory-status--${status}`}>{inventoryStatusLabel(status)}</span>
          <dl className="inventory-details">
            <dt>Quantidade atual</dt><dd>{item.quantidadeAtual}</dd>
            <dt>Estoque mínimo</dt><dd>{item.quantidadeMinima}</dd>
            {item.categoria && <><dt>Categoria</dt><dd>{item.categoria}</dd></>}
            <dt>Local</dt><dd>{item.localizacao || 'Não informado'}</dd>
            <dt>Cadastro</dt><dd>{item.ativo ? 'Ativo' : 'Inativo'}</dd>
          </dl>

          {canWriteStock(profile) && item.ativo && (
            <section className="inventory-details__actions" aria-labelledby="inventory-actions-heading">
              <h3 id="inventory-actions-heading">Movimentar estoque</h3>
              <div>
                <Button onClick={() => onAction('entry', item)}>Entrada</Button>
                <Button variant="secondary" onClick={() => onAction('exit', item)}>Saída</Button>
              </div>
            </section>
          )}

          {profile === 'ADMIN' && (
            <section className="inventory-details__actions inventory-details__actions--administrative" aria-labelledby="inventory-admin-actions-heading">
              <h3 id="inventory-admin-actions-heading">Cadastro</h3>
              <div>
                <Button variant="secondary" onClick={() => onAction('edit', item)}>Editar</Button>
                {item.ativo && <Button variant="ghost" onClick={() => onAction('correction', item)}>Corrigir estoque</Button>}
                {item.ativo && <Button variant="danger" onClick={() => onAction('inactivate', item)}>Inativar</Button>}
              </div>
            </section>
          )}

          <section className="inventory-history" aria-labelledby="inventory-history-heading">
            <h3 id="inventory-history-heading">Histórico</h3>
            {historyLoading && <p className="inventory-history__state" role="status">Carregando histórico…</p>}
            {historyError && (
              <div className="inventory-history__state" role="alert">
                <p>Não foi possível carregar o histórico.</p>
                <Button variant="secondary" onClick={onRetryHistory}>Tentar novamente</Button>
              </div>
            )}
            {!historyLoading && !historyError && orderedHistory.length === 0 && (
              <p className="inventory-history__state">Nenhuma movimentação registrada.</p>
            )}
            {!historyLoading && !historyError && orderedHistory.length > 0 && (
              <ol className="inventory-history__list">
                {orderedHistory.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
