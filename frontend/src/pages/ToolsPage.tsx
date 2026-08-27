import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { FeedbackState } from '../components/FeedbackState'
import {
  ToolActionDialog,
  type ToolDialogValues,
} from '../components/tools/ToolActionDialog'
import { ToolDetailsPanel } from '../components/tools/ToolDetailsPanel'
import { ApiError } from '../lib/api-client'
import { formatOperationalDateTime } from '../lib/format'
import {
  filterLabels,
  filterTools,
  primaryToolAction,
  toolCurrentLocation,
  toolStatusLabel,
  toolStatusTone,
  type ToolAction,
  type ToolFilter,
} from '../lib/tool-ui'
import { useAuth } from '../providers/AuthProvider'
import { useOrganization } from '../providers/OrganizationProvider'
import {
  toolKeys,
  toolService,
  type ToolFormInput,
  type ToolMovementInput,
} from '../services/tool-service'
import type { Tool } from '../types/api'

interface MutationRequest {
  action: ToolAction
  tool: Tool | null
  values: ToolDialogValues
}

const primaryActionLabels: Partial<Record<ToolAction, string>> = {
  withdraw: 'Retirar',
  return: 'Devolver',
  'complete-maintenance': 'Concluir manutenção',
}

const successMessages: Record<ToolAction, string> = {
  create: 'Ferramenta cadastrada.',
  edit: 'Ferramenta atualizada.',
  withdraw: 'Retirada registrada.',
  return: 'Devolução registrada.',
  transfer: 'Transferência registrada.',
  maintenance: 'Manutenção registrada.',
  'complete-maintenance': 'Ferramenta disponível novamente.',
  loss: 'Perda registrada.',
  correction: 'Estado corrigido.',
  inactivate: 'Ferramenta inativada.',
}

function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

function toolForm(values: ToolDialogValues): ToolFormInput {
  return {
    patrimonio: values.patrimonio?.trim() ?? '',
    nome: values.nome?.trim() ?? '',
    categoria: optionalValue(values.categoria),
    localizacao: optionalValue(values.localizacao),
  }
}

function movementInput(values: ToolDialogValues): ToolMovementInput {
  return {
    observacao: optionalValue(values.observacao),
    destino: optionalValue(values.destino),
    novoResponsavelUsuarioId: values.novoResponsavelUsuarioId,
    novoStatus: values.novoStatus,
  }
}

async function executeMutation({ action, tool, values }: MutationRequest) {
  if (action === 'create') return toolService.create(toolForm(values))
  if (!tool) throw new Error('Ferramenta não selecionada')

  switch (action) {
    case 'edit': return toolService.update(tool.id, toolForm(values))
    case 'withdraw': return toolService.withdraw(tool.id, movementInput(values))
    case 'return': return toolService.returnTool(tool.id, movementInput(values))
    case 'transfer': return toolService.transfer(tool.id, movementInput(values))
    case 'maintenance': return toolService.sendToMaintenance(tool.id, movementInput(values))
    case 'complete-maintenance': return toolService.completeMaintenance(tool.id, movementInput(values))
    case 'loss': return toolService.reportLoss(tool.id, movementInput(values))
    case 'correction': return toolService.correctState(tool.id, movementInput(values))
    case 'inactivate': return toolService.inactivate(tool.id)
  }
}

function mutationErrorMessage(error: Error | null, action: ToolAction | null): string | undefined {
  if (!error) return undefined
  if (!(error instanceof ApiError)) return 'Não foi possível registrar. Tente novamente.'
  if (error.status === 0) return 'Sem conexão com o servidor. Tente novamente.'
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
  if (error.status === 403) return 'Você não tem permissão para esta ação.'
  if (error.status === 409) return 'Esta ferramenta mudou de estado. Atualize a lista.'
  if (action === 'withdraw') return 'A ferramenta não está disponível para retirada.'
  if (action === 'return' || action === 'transfer') return 'A ferramenta não está em uso.'
  if (error.code === 'REGRA_NEGOCIO' && action === 'inactivate') return 'Esta ferramenta não pode ser inativada agora.'
  return 'Não foi possível registrar. Tente novamente.'
}

function ToolRow({
  tool,
  profile,
  onOpen,
  onAction,
}: {
  tool: Tool
  profile: 'ADMIN' | 'OPERADOR' | 'CONSULTA'
  onOpen: (tool: Tool) => void
  onAction: (action: ToolAction, tool: Tool) => void
}) {
  const primaryAction = primaryToolAction(tool, profile)
  const since = tool.status === 'EMPRESTADA'
    ? formatOperationalDateTime(tool.responsavelDesde)
    : '—'

  const openWithKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onOpen(tool)
    }
  }

  return (
    <article
      className="tool-row"
      aria-label={`Abrir detalhes de ${tool.nome}`}
      tabIndex={0}
      onClick={() => onOpen(tool)}
      onKeyDown={openWithKeyboard}
    >
      <div className="tool-row__identity">
        <strong>{tool.nome}</strong>
        {tool.categoria && <span>{tool.categoria}</span>}
      </div>
      <span className="tool-row__asset" data-label="Patrimônio">{tool.patrimonio}</span>
      <span className={`tool-status tool-status--${toolStatusTone(tool)}`} data-label="Situação">
        {toolStatusLabel(tool)}
      </span>
      <span className="tool-row__responsible" data-label="Responsável">
        {tool.responsavelAtualNome ? `Com ${tool.responsavelAtualNome}` : '—'}
      </span>
      <span className="tool-row__location" data-label="Onde está">{toolCurrentLocation(tool)}</span>
      <time className="tool-row__since" data-label="Desde" dateTime={tool.responsavelDesde ?? undefined}>{since}</time>
      <div className="tool-row__action" onClick={(event) => event.stopPropagation()}>
        {primaryAction ? (
          <Button onClick={() => onAction(primaryAction, tool)}>
            {primaryActionLabels[primaryAction]}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => onOpen(tool)}>Ver detalhes</Button>
        )}
      </div>
    </article>
  )
}

export function ToolsPage() {
  const queryClient = useQueryClient()
  const { account } = useAuth()
  const { selectedOrganization } = useOrganization()
  const organizationId = selectedOrganization?.id
  const profile = selectedOrganization?.perfil ?? 'CONSULTA'
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ToolFilter>('active')
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null)
  const [dialogAction, setDialogAction] = useState<ToolAction | null>(null)
  const [dialogToolId, setDialogToolId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setSearch('')
    setFilter('active')
    setSelectedToolId(null)
    setDialogAction(null)
    setFeedback(null)
  }, [organizationId])

  const toolsQuery = useQuery({
    queryKey: organizationId ? toolKeys.list(organizationId) : toolKeys.all,
    queryFn: toolService.list,
    enabled: Boolean(organizationId),
  })
  const tools = toolsQuery.data ?? []
  const sortedTools = useMemo(
    () => [...tools].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR')
      || left.patrimonio.localeCompare(right.patrimonio, 'pt-BR')),
    [tools],
  )
  const visibleTools = useMemo(
    () => filterTools(sortedTools, filter, search, account?.id),
    [account?.id, filter, search, sortedTools],
  )
  const selectedListTool = tools.find((tool) => tool.id === selectedToolId) ?? null
  const dialogTool = tools.find((tool) => tool.id === dialogToolId) ?? selectedListTool

  const detailQuery = useQuery({
    queryKey: organizationId && selectedToolId
      ? toolKeys.detail(organizationId, selectedToolId)
      : [...toolKeys.all, 'detail', 'idle'],
    queryFn: () => {
      if (selectedToolId === null) throw new Error('Ferramenta não selecionada')
      return toolService.get(selectedToolId)
    },
    enabled: Boolean(organizationId && selectedToolId),
  })
  const historyQuery = useQuery({
    queryKey: organizationId && selectedToolId
      ? toolKeys.history(organizationId, selectedToolId)
      : [...toolKeys.all, 'history', 'idle'],
    queryFn: () => {
      if (selectedToolId === null) throw new Error('Ferramenta não selecionada')
      return toolService.history(selectedToolId)
    },
    enabled: Boolean(organizationId && selectedToolId),
  })
  const responsiblesQuery = useQuery({
    queryKey: organizationId
      ? toolKeys.transferResponsibles(organizationId)
      : [...toolKeys.all, 'transfer-responsibles', 'idle'],
    queryFn: toolService.transferResponsibles,
    enabled: Boolean(organizationId && dialogAction === 'transfer'),
  })

  const mutation = useMutation({
    mutationFn: executeMutation,
    onSuccess: async (_result, request) => {
      setFeedback(successMessages[request.action])
      setDialogAction(null)
      setDialogToolId(null)
      if (!organizationId) return
      const invalidations: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: toolKeys.list(organizationId) }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] }),
      ]
      if (request.tool) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: toolKeys.detail(organizationId, request.tool.id) }),
          queryClient.invalidateQueries({ queryKey: toolKeys.history(organizationId, request.tool.id) }),
        )
      }
      await Promise.all(invalidations)
    },
  })

  const openAction = (action: ToolAction, tool: Tool | null = null) => {
    mutation.reset()
    setDialogToolId(tool?.id ?? null)
    setDialogAction(action)
  }

  const closeAction = () => {
    if (!mutation.isPending) {
      setDialogAction(null)
      setDialogToolId(null)
      mutation.reset()
    }
  }

  const submitAction = async (values: ToolDialogValues) => {
    if (!dialogAction) return
    try {
      await mutation.mutateAsync({ action: dialogAction, tool: dialogTool, values })
    } catch {
      // A mensagem sanitizada permanece no diálogo.
    }
  }

  const filters: ToolFilter[] = ['active', 'available', 'borrowed', 'maintenance', 'lost', 'inactive']
  if (profile === 'ADMIN' || profile === 'OPERADOR') filters.push('mine')

  if (toolsQuery.isLoading) {
    return <FeedbackState type="loading" title="Carregando ferramentas" message="Consultando o almoxarifado." />
  }

  if (toolsQuery.error) {
    const networkError = toolsQuery.error instanceof ApiError && toolsQuery.error.status === 0
    return (
      <FeedbackState
        type="error"
        title="Não foi possível carregar as ferramentas."
        message={networkError ? 'Sem conexão com o servidor. Tente novamente.' : 'Tente novamente em instantes.'}
        actionLabel="Tentar novamente"
        onAction={() => void toolsQuery.refetch()}
      />
    )
  }

  const selectedTool = detailQuery.data ?? selectedListTool
  const hasSearch = Boolean(search.trim())
  const noTools = tools.length === 0

  return (
    <div className="tools-page">
      <header className="tools-page__heading">
        <h1>Ferramentas</h1>
        {profile === 'ADMIN' && <Button className="tools-page__new" variant="secondary" onClick={() => openAction('create')}>Nova ferramenta</Button>}
      </header>

      {feedback && (
        <div className="tools-toast" role="status">
          <span>{feedback}</span>
          <button className="icon-button" onClick={() => setFeedback(null)} aria-label="Fechar mensagem"><X size={17} /></button>
        </div>
      )}

      <div className="tools-search">
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="tool-search">Buscar ferramentas</label>
        <input
          id="tool-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou patrimônio"
          autoComplete="off"
        />
        {search && (
          <button className="icon-button" onClick={() => setSearch('')} aria-label="Limpar busca">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="tools-filter-bar">
        <div className="tools-filters" aria-label="Filtrar ferramentas">
          {filters.map((item) => (
            <button
              key={item}
              className={filter === item ? 'tools-filter tools-filter--active' : 'tools-filter'}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {filterLabels[item]}
            </button>
          ))}
        </div>
        <span className="tools-result-count" role="status">
          {visibleTools.length} {visibleTools.length === 1 ? 'encontrada' : 'encontradas'}
        </span>
      </div>

      {noTools ? (
        <div className="tools-empty" role="status">
          <p>Nenhuma ferramenta cadastrada.</p>
          {profile === 'ADMIN' && <Button variant="secondary" onClick={() => openAction('create')}>Cadastrar ferramenta</Button>}
        </div>
      ) : visibleTools.length === 0 ? (
        <div className="tools-empty" role="status">
          <p>{hasSearch
            ? `Nenhuma ferramenta encontrada para “${search.trim()}”.`
            : 'Nenhuma ferramenta neste filtro.'}</p>
          <Button variant="ghost" onClick={() => {
            if (hasSearch) setSearch('')
            else setFilter('active')
          }}>{hasSearch ? 'Limpar busca' : 'Limpar filtros'}</Button>
        </div>
      ) : (
        <section className="tools-list" aria-label="Lista de ferramentas">
          <div className="tools-list__header" aria-hidden="true">
            <span>Ferramenta</span><span>Patrimônio</span><span>Situação</span><span>Responsável</span>
            <span>Onde está</span><span>Desde</span><span>Ação</span>
          </div>
          {visibleTools.map((tool) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              profile={profile}
              onOpen={(selected) => setSelectedToolId(selected.id)}
              onAction={(action, selected) => openAction(action, selected)}
            />
          ))}
        </section>
      )}

      {selectedTool && !dialogAction && (
        <ToolDetailsPanel
          tool={selectedTool}
          profile={profile}
          account={account}
          history={historyQuery.data}
          historyLoading={historyQuery.isLoading}
          historyError={historyQuery.isError}
          onRetryHistory={() => void historyQuery.refetch()}
          onClose={() => setSelectedToolId(null)}
          onAction={(action, tool) => openAction(action, tool)}
        />
      )}

      <ToolActionDialog
        action={dialogAction}
        tool={dialogTool}
        responsibles={responsiblesQuery.data}
        responsiblesLoading={responsiblesQuery.isLoading}
        responsiblesError={responsiblesQuery.isError}
        pending={mutation.isPending}
        requestError={mutationErrorMessage(mutation.error, dialogAction)}
        onClose={closeAction}
        onSubmit={submitAction}
      />
    </div>
  )
}
