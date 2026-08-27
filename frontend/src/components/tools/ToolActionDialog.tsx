import { useEffect, useMemo, useState } from 'react'
import type { Tool, ToolStatus, TransferResponsible } from '../../types/api'
import type { ToolAction } from '../../lib/tool-ui'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import { Field } from '../Field'

export interface ToolDialogValues {
  patrimonio?: string
  nome?: string
  categoria?: string
  localizacao?: string
  destino?: string
  observacao?: string
  novoResponsavelUsuarioId?: number
  novoStatus?: Exclude<ToolStatus, 'EMPRESTADA'>
}

interface ToolActionDialogProps {
  action: ToolAction | null
  tool: Tool | null
  responsibles?: TransferResponsible[]
  responsiblesLoading: boolean
  responsiblesError: boolean
  pending: boolean
  requestError?: string
  onClose: () => void
  onSubmit: (values: ToolDialogValues) => Promise<void>
}

const dialogTitles: Record<ToolAction, string> = {
  create: 'Nova ferramenta',
  edit: 'Editar ferramenta',
  withdraw: 'Retirar ferramenta',
  return: 'Devolver ferramenta',
  transfer: 'Transferir ferramenta',
  maintenance: 'Enviar para manutenção',
  'complete-maintenance': 'Concluir manutenção',
  loss: 'Registrar perda',
  correction: 'Corrigir estado',
  inactivate: 'Inativar ferramenta',
}

const submitLabels: Record<ToolAction, string> = {
  create: 'Cadastrar ferramenta',
  edit: 'Salvar alterações',
  withdraw: 'Registrar retirada',
  return: 'Confirmar devolução',
  transfer: 'Confirmar transferência',
  maintenance: 'Enviar para manutenção',
  'complete-maintenance': 'Concluir manutenção',
  loss: 'Registrar perda',
  correction: 'Registrar correção',
  inactivate: 'Inativar ferramenta',
}

type FieldErrors = Partial<Record<keyof ToolDialogValues, string>>

export function ToolActionDialog({
  action,
  tool,
  responsibles,
  responsiblesLoading,
  responsiblesError,
  pending,
  requestError,
  onClose,
  onSubmit,
}: ToolActionDialogProps) {
  const [values, setValues] = useState<ToolDialogValues>({})
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    setValues(action === 'edit' && tool ? {
      patrimonio: tool.patrimonio,
      nome: tool.nome,
      categoria: tool.categoria ?? '',
      localizacao: tool.localizacao ?? '',
    } : {})
    setErrors({})
  }, [action, tool])

  const eligibleResponsibles = useMemo(
    () => (responsibles ?? []).filter((responsible) => responsible.id !== tool?.responsavelAtualId),
    [responsibles, tool?.responsavelAtualId],
  )

  if (!action) return null

  const updateValue = <Key extends keyof ToolDialogValues>(key: Key, value: ToolDialogValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}
    if (action === 'create' || action === 'edit') {
      if (!values.patrimonio?.trim()) nextErrors.patrimonio = 'Informe o patrimônio.'
      if (!values.nome?.trim()) nextErrors.nome = 'Informe o nome.'
    }
    if (action === 'transfer') {
      if (!values.novoResponsavelUsuarioId) nextErrors.novoResponsavelUsuarioId = 'Selecione o novo responsável.'
      if (values.novoResponsavelUsuarioId === tool?.responsavelAtualId) {
        nextErrors.novoResponsavelUsuarioId = 'Escolha uma pessoa diferente.'
      }
    }
    if ((action === 'maintenance' || action === 'loss' || action === 'correction')
      && !values.observacao?.trim()) {
      nextErrors.observacao = action === 'maintenance'
        ? 'Informe o motivo da manutenção.'
        : 'Informe o motivo.'
    }
    if (action === 'correction' && !values.novoStatus) nextErrors.novoStatus = 'Selecione o novo estado.'
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

  const observationRequired = action === 'maintenance' || action === 'loss' || action === 'correction'
  const showObservation = !['create', 'edit', 'inactivate'].includes(action)
  const showDestination = action === 'withdraw' || action === 'transfer'
  const isDanger = action === 'loss' || action === 'inactivate'

  return (
    <Dialog open title={dialogTitles[action]} onClose={pending ? () => undefined : onClose}>
      <form className="dialog-form tool-action-form" onSubmit={(event) => void submit(event)} noValidate>
        {tool && action !== 'edit' && (
          <p className="tool-action-form__tool"><strong>{tool.nome}</strong><span>{tool.patrimonio}</span></p>
        )}

        {(action === 'create' || action === 'edit') && (
          <>
            <Field
              label="Patrimônio"
              name="patrimonio"
              value={values.patrimonio ?? ''}
              onChange={(event) => updateValue('patrimonio', event.target.value)}
              error={errors.patrimonio}
              maxLength={60}
              autoFocus
            />
            <Field
              label="Nome"
              name="nome"
              value={values.nome ?? ''}
              onChange={(event) => updateValue('nome', event.target.value)}
              error={errors.nome}
              maxLength={120}
            />
            <Field
              label="Categoria (opcional)"
              name="categoria"
              value={values.categoria ?? ''}
              onChange={(event) => updateValue('categoria', event.target.value)}
              maxLength={80}
            />
            <Field
              label="Local de guarda (opcional)"
              name="localizacao"
              value={values.localizacao ?? ''}
              onChange={(event) => updateValue('localizacao', event.target.value)}
              maxLength={120}
            />
          </>
        )}

        {action === 'transfer' && (
          <div className="field">
            <label htmlFor="novo-responsavel">Novo responsável</label>
            <select
              id="novo-responsavel"
              value={values.novoResponsavelUsuarioId ?? ''}
              onChange={(event) => updateValue(
                'novoResponsavelUsuarioId',
                event.target.value ? Number(event.target.value) : undefined,
              )}
              aria-invalid={Boolean(errors.novoResponsavelUsuarioId)}
              aria-describedby={errors.novoResponsavelUsuarioId ? 'novo-responsavel-message' : undefined}
              disabled={responsiblesLoading || responsiblesError}
            >
              <option value="">Selecione uma pessoa</option>
              {eligibleResponsibles.map((responsible) => (
                <option key={responsible.id} value={responsible.id}>{responsible.nome}</option>
              ))}
            </select>
            {responsiblesLoading && <span className="field__hint">Carregando pessoas…</span>}
            {responsiblesError && <span className="field__error">Não foi possível carregar os responsáveis.</span>}
            {!responsiblesLoading && !responsiblesError && eligibleResponsibles.length === 0 && (
              <span className="field__hint">Nenhuma outra pessoa está disponível.</span>
            )}
            {errors.novoResponsavelUsuarioId && (
              <span id="novo-responsavel-message" className="field__error">{errors.novoResponsavelUsuarioId}</span>
            )}
          </div>
        )}

        {showDestination && (
          <Field
            label="Destino (opcional)"
            name="destino"
            value={values.destino ?? ''}
            onChange={(event) => updateValue('destino', event.target.value)}
            maxLength={160}
          />
        )}

        {action === 'correction' && (
          <div className="field">
            <label htmlFor="novo-status">Novo estado</label>
            <select
              id="novo-status"
              value={values.novoStatus ?? ''}
              onChange={(event) => updateValue(
                'novoStatus',
                (event.target.value || undefined) as ToolDialogValues['novoStatus'],
              )}
              aria-invalid={Boolean(errors.novoStatus)}
              aria-describedby={errors.novoStatus ? 'novo-status-message' : undefined}
            >
              <option value="">Selecione o estado</option>
              {tool?.status !== 'DISPONIVEL' && <option value="DISPONIVEL">Disponível</option>}
              {tool?.status !== 'MANUTENCAO' && <option value="MANUTENCAO">Manutenção</option>}
              {tool?.status !== 'PERDIDA' && <option value="PERDIDA">Perdida</option>}
            </select>
            {errors.novoStatus && <span id="novo-status-message" className="field__error">{errors.novoStatus}</span>}
          </div>
        )}

        {showObservation && (
          <div className="field">
            <label htmlFor="tool-observation">
              {action === 'maintenance' ? 'Motivo' : action === 'loss' || action === 'correction' ? 'Motivo' : 'Observação (opcional)'}
            </label>
            <textarea
              id="tool-observation"
              value={values.observacao ?? ''}
              onChange={(event) => updateValue('observacao', event.target.value)}
              maxLength={500}
              rows={3}
              required={observationRequired}
              aria-invalid={Boolean(errors.observacao)}
              aria-describedby={errors.observacao ? 'tool-observation-message' : undefined}
            />
            {errors.observacao && (
              <span id="tool-observation-message" className="field__error">{errors.observacao}</span>
            )}
          </div>
        )}

        {action === 'complete-maintenance' && (
          <p className="tool-action-form__confirmation">A ferramenta voltará a ficar disponível no almoxarifado.</p>
        )}
        {action === 'inactivate' && (
          <p className="tool-action-form__confirmation">
            A ferramenta deixará de aparecer entre as ativas. Esta ação não possui reativação nesta versão.
          </p>
        )}

        {requestError && <div className="alert alert--error" role="alert">{requestError}</div>}

        <div className="dialog-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button type="submit" variant={isDanger ? 'danger' : 'primary'} loading={pending}>
            {submitLabels[action]}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
