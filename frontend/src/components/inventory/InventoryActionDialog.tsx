import { useEffect, useState } from 'react'
import type { InventoryAction } from '../../lib/inventory-ui'
import type { StockItem } from '../../types/api'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import { Field } from '../Field'

export interface InventoryDialogValues {
  codigo?: string
  nome?: string
  categoria?: string
  quantidadeAtual?: number
  quantidadeMinima?: number
  localizacao?: string
  quantidade?: number
  observacao?: string
}

interface InventoryActionDialogProps {
  action: InventoryAction | null
  item: StockItem | null
  pending: boolean
  requestError?: string
  onClose: () => void
  onSubmit: (values: InventoryDialogValues) => Promise<void>
}

const titles: Record<InventoryAction, string> = {
  create: 'Novo item',
  edit: 'Editar item',
  entry: 'Entrada de estoque',
  exit: 'Saída de estoque',
  correction: 'Corrigir estoque',
  inactivate: 'Inativar item',
}

const submitLabels: Record<InventoryAction, string> = {
  create: 'Cadastrar item',
  edit: 'Salvar alterações',
  entry: 'Registrar entrada',
  exit: 'Registrar saída',
  correction: 'Registrar correção',
  inactivate: 'Inativar item',
}

type FieldErrors = Partial<Record<keyof InventoryDialogValues, string>>

export function InventoryActionDialog({
  action,
  item,
  pending,
  requestError,
  onClose,
  onSubmit,
}: InventoryActionDialogProps) {
  const [values, setValues] = useState<InventoryDialogValues>({})
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    setValues(action === 'edit' && item ? {
      codigo: item.codigo,
      nome: item.nome,
      categoria: item.categoria ?? '',
      quantidadeAtual: item.quantidadeAtual,
      quantidadeMinima: item.quantidadeMinima,
      localizacao: item.localizacao ?? '',
    } : action === 'create' ? { quantidadeAtual: 0, quantidadeMinima: 0 } : {})
    setErrors({})
  }, [action, item])

  if (!action) return null

  const updateValue = <Key extends keyof InventoryDialogValues>(key: Key, value: InventoryDialogValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}
    if (action === 'create' || action === 'edit') {
      if (!values.codigo?.trim()) nextErrors.codigo = 'Informe o código.'
      if (!values.nome?.trim()) nextErrors.nome = 'Informe o nome.'
      if ((values.quantidadeMinima ?? -1) < 0) nextErrors.quantidadeMinima = 'Informe um valor igual ou maior que zero.'
      if (action === 'create' && (values.quantidadeAtual ?? -1) < 0) {
        nextErrors.quantidadeAtual = 'Informe um valor igual ou maior que zero.'
      }
    }
    if (action === 'entry' || action === 'exit') {
      if (!Number.isInteger(values.quantidade) || (values.quantidade ?? 0) <= 0) {
        nextErrors.quantidade = 'Informe uma quantidade maior que zero.'
      }
    }
    if (action === 'correction') {
      if (!Number.isInteger(values.quantidade) || (values.quantidade ?? -1) < 0) {
        nextErrors.quantidade = 'Informe o novo saldo.'
      }
      if (!values.observacao?.trim()) nextErrors.observacao = 'Informe o motivo da correção.'
    }
    return nextErrors
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    await onSubmit(values)
  }

  const isItemForm = action === 'create' || action === 'edit'
  const isMovement = action === 'entry' || action === 'exit' || action === 'correction'

  return (
    <Dialog open title={titles[action]} onClose={onClose}>
      <form className="dialog-form" noValidate onSubmit={(event) => void submit(event)}>
        {item && !isItemForm && (
          <p className="inventory-action-form__item">
            <strong>{item.nome}</strong><span>{item.quantidadeAtual} em estoque</span>
          </p>
        )}

        {isItemForm && (
          <>
            <Field label="Código" name="codigo" value={values.codigo ?? ''} error={errors.codigo}
              onChange={(event) => updateValue('codigo', event.target.value)} maxLength={60} />
            <Field label="Nome" name="nome" value={values.nome ?? ''} error={errors.nome}
              onChange={(event) => updateValue('nome', event.target.value)} maxLength={120} />
            <Field label="Categoria (opcional)" name="categoria" value={values.categoria ?? ''}
              onChange={(event) => updateValue('categoria', event.target.value)} maxLength={80} />
            {action === 'create' && (
              <Field label="Quantidade inicial" name="quantidadeAtual" type="number" min={0} step={1}
                value={values.quantidadeAtual ?? 0} error={errors.quantidadeAtual}
                onChange={(event) => updateValue('quantidadeAtual', Number(event.target.value))} />
            )}
            <Field label="Estoque mínimo" name="quantidadeMinima" type="number" min={0} step={1}
              value={values.quantidadeMinima ?? 0} error={errors.quantidadeMinima}
              onChange={(event) => updateValue('quantidadeMinima', Number(event.target.value))} />
            <Field label="Local (opcional)" name="localizacao" value={values.localizacao ?? ''}
              onChange={(event) => updateValue('localizacao', event.target.value)} maxLength={120} />
            {action === 'edit' && <p className="field__hint">O saldo é alterado somente por entrada, saída ou correção.</p>}
          </>
        )}

        {isMovement && (
          <>
            <Field
              label={action === 'correction' ? 'Novo saldo' : 'Quantidade'}
              name="quantidade"
              type="number"
              min={action === 'correction' ? 0 : 1}
              step={1}
              value={values.quantidade ?? ''}
              error={errors.quantidade}
              onChange={(event) => updateValue('quantidade', event.target.value === '' ? undefined : Number(event.target.value))}
              autoFocus
            />
            <div className="field">
              <label htmlFor="inventory-observation">
                {action === 'correction' ? 'Motivo' : 'Observação (opcional)'}
              </label>
              <textarea
                id="inventory-observation"
                value={values.observacao ?? ''}
                maxLength={500}
                aria-invalid={Boolean(errors.observacao)}
                aria-describedby={errors.observacao ? 'inventory-observation-error' : undefined}
                onChange={(event) => updateValue('observacao', event.target.value)}
              />
              {errors.observacao && <span id="inventory-observation-error" className="field__error">{errors.observacao}</span>}
            </div>
          </>
        )}

        {action === 'inactivate' && (
          <p className="inventory-action-form__confirmation">
            O item deixa de aceitar movimentações e não possui reativação nesta versão. O histórico será preservado.
          </p>
        )}

        {requestError && <div className="alert alert--error" role="alert">{requestError}</div>}
        <div className="dialog-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button type="submit" variant={action === 'inactivate' ? 'danger' : 'primary'} loading={pending}>
            {submitLabels[action]}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
