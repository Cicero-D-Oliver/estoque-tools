import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  InventoryActionDialog,
  type InventoryDialogValues,
} from '../components/inventory/InventoryActionDialog'
import { InventoryDetailsPanel } from '../components/inventory/InventoryDetailsPanel'
import { Button } from '../components/Button'
import { FeedbackState } from '../components/FeedbackState'
import { ApiError } from '../lib/api-client'
import {
  canWriteStock,
  filterInventory,
  inventoryFilterLabels,
  inventoryStatus,
  inventoryStatusLabel,
  type InventoryAction,
  type InventoryFilter,
} from '../lib/inventory-ui'
import { useOrganization } from '../providers/OrganizationProvider'
import {
  inventoryKeys,
  inventoryService,
  type StockItemInput,
  type StockMovementInput,
} from '../services/inventory-service'
import type { StockItem } from '../types/api'

interface MutationRequest {
  action: InventoryAction
  item: StockItem | null
  values: InventoryDialogValues
}

const successMessages: Record<InventoryAction, string> = {
  create: 'Item cadastrado.',
  edit: 'Item atualizado.',
  entry: 'Entrada registrada.',
  exit: 'Saída registrada.',
  correction: 'Estoque corrigido.',
  inactivate: 'Item inativado.',
}

function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}

function itemInput(values: InventoryDialogValues, currentItem: StockItem | null): StockItemInput {
  return {
    codigo: values.codigo?.trim() ?? '',
    nome: values.nome?.trim() ?? '',
    categoria: optionalValue(values.categoria),
    quantidadeAtual: values.quantidadeAtual ?? currentItem?.quantidadeAtual ?? 0,
    quantidadeMinima: values.quantidadeMinima ?? currentItem?.quantidadeMinima ?? 0,
    localizacao: optionalValue(values.localizacao),
  }
}

function movementInput(values: InventoryDialogValues): StockMovementInput {
  return {
    quantidade: values.quantidade ?? 0,
    observacao: optionalValue(values.observacao),
  }
}

async function executeMutation({ action, item, values }: MutationRequest) {
  if (action === 'create') return inventoryService.create(itemInput(values, null))
  if (!item) throw new Error('Item não selecionado')

  switch (action) {
    case 'edit': return inventoryService.update(item.id, itemInput(values, item))
    case 'entry': return inventoryService.entry(item.id, movementInput(values))
    case 'exit': return inventoryService.exit(item.id, movementInput(values))
    case 'correction': return inventoryService.correct(item.id, movementInput(values))
    case 'inactivate': return inventoryService.inactivate(item.id)
  }
}

function mutationErrorMessage(error: Error | null, action: InventoryAction | null): string | undefined {
  if (!error) return undefined
  if (!(error instanceof ApiError)) return 'Não foi possível concluir. Tente novamente.'
  if (error.status === 0) return 'Sem conexão com o servidor. Tente novamente.'
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
  if (error.status === 403) return 'Você não tem permissão para esta ação.'
  if (error.status === 409) return 'Este item foi alterado. Atualize os dados.'
  if (action === 'exit' && (error.code === 'REGRA_NEGOCIO' || /insuficiente/i.test(error.message))) {
    return 'Estoque insuficiente.'
  }
  if (error.fields.quantidade) return error.fields.quantidade
  if (action === 'entry') return 'Não foi possível registrar a entrada.'
  if (action === 'exit') return 'Não foi possível registrar a saída.'
  return 'Não foi possível concluir. Tente novamente.'
}

function InventoryRow({
  item,
  profile,
  officialLowStockIds,
  onOpen,
  onAction,
}: {
  item: StockItem
  profile: 'ADMIN' | 'OPERADOR' | 'CONSULTA'
  officialLowStockIds: ReadonlySet<number>
  onOpen: (item: StockItem) => void
  onAction: (action: InventoryAction, item: StockItem) => void
}) {
  const status = inventoryStatus(item, officialLowStockIds)
  const writable = canWriteStock(profile) && item.ativo

  const openWithKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onOpen(item)
    }
  }

  return (
    <article
      className="inventory-row"
      aria-label={`Abrir detalhes de ${item.nome}`}
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={openWithKeyboard}
    >
      <div className="inventory-row__identity">
        <strong>{item.nome}</strong>
        {item.categoria && <span>{item.categoria}</span>}
      </div>
      <span className="inventory-row__code" data-label="Código">{item.codigo}</span>
      <strong className="inventory-row__quantity" data-label="Quantidade">{item.quantidadeAtual}</strong>
      <span className="inventory-row__minimum" data-label="Mínimo">{item.quantidadeMinima}</span>
      <span className={`inventory-status inventory-status--${status}`} data-label="Situação">
        {inventoryStatusLabel(status)}
      </span>
      <span className="inventory-row__location" data-label="Local">{item.localizacao || '—'}</span>
      <div className="inventory-row__actions" onClick={(event) => event.stopPropagation()}>
        {writable ? (
          <>
            <Button onClick={() => onAction('entry', item)}>Entrada</Button>
            {item.quantidadeAtual > 0 && (
              <Button variant="secondary" onClick={() => onAction('exit', item)}>Saída</Button>
            )}
          </>
        ) : (
          <Button variant="ghost" onClick={() => onOpen(item)}>Ver detalhes</Button>
        )}
      </div>
    </article>
  )
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const { selectedOrganization } = useOrganization()
  const organizationId = selectedOrganization?.id
  const profile = selectedOrganization?.perfil ?? 'CONSULTA'
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InventoryFilter>('active')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [dialogAction, setDialogAction] = useState<InventoryAction | null>(null)
  const [dialogItemId, setDialogItemId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setSearch('')
    setFilter('active')
    setSelectedItemId(null)
    setDialogAction(null)
    setFeedback(null)
  }, [organizationId])

  const itemsQuery = useQuery({
    queryKey: organizationId ? inventoryKeys.list(organizationId) : inventoryKeys.all,
    queryFn: inventoryService.list,
    enabled: Boolean(organizationId),
  })
  const lowStockQuery = useQuery({
    queryKey: organizationId ? inventoryKeys.lowStock(organizationId) : [...inventoryKeys.all, 'low-stock'],
    queryFn: inventoryService.lowStock,
    enabled: Boolean(organizationId),
  })

  const items = itemsQuery.data ?? []
  const officialLowStockIds = useMemo(() => new Set(
    (lowStockQuery.data ?? items.filter((item) => item.abaixoMinimo)).map((item) => item.id),
  ), [items, lowStockQuery.data])
  const sortedItems = useMemo(
    () => [...items].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR')
      || left.codigo.localeCompare(right.codigo, 'pt-BR')),
    [items],
  )
  const visibleItems = useMemo(
    () => filterInventory(sortedItems, filter, search, officialLowStockIds),
    [filter, officialLowStockIds, search, sortedItems],
  )
  const selectedListItem = items.find((item) => item.id === selectedItemId) ?? null
  const dialogItem = items.find((item) => item.id === dialogItemId) ?? selectedListItem

  const detailQuery = useQuery({
    queryKey: organizationId && selectedItemId
      ? inventoryKeys.detail(organizationId, selectedItemId)
      : [...inventoryKeys.all, 'detail', 'idle'],
    queryFn: () => {
      if (selectedItemId === null) throw new Error('Item não selecionado')
      return inventoryService.get(selectedItemId)
    },
    enabled: Boolean(organizationId && selectedItemId),
  })
  const historyQuery = useQuery({
    queryKey: organizationId && selectedItemId
      ? inventoryKeys.history(organizationId, selectedItemId)
      : [...inventoryKeys.all, 'history', 'idle'],
    queryFn: () => {
      if (selectedItemId === null) throw new Error('Item não selecionado')
      return inventoryService.history(selectedItemId)
    },
    enabled: Boolean(organizationId && selectedItemId),
  })

  const mutation = useMutation({
    mutationFn: executeMutation,
    onSuccess: async (_result, request) => {
      setFeedback(successMessages[request.action])
      setDialogAction(null)
      setDialogItemId(null)
      if (!organizationId) return
      const invalidations: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: inventoryKeys.list(organizationId) }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock(organizationId) }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] }),
      ]
      if (request.item) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(organizationId, request.item.id) }),
          queryClient.invalidateQueries({ queryKey: inventoryKeys.history(organizationId, request.item.id) }),
        )
      }
      await Promise.all(invalidations)
    },
  })

  const openAction = (action: InventoryAction, item: StockItem | null = null) => {
    mutation.reset()
    setDialogItemId(item?.id ?? null)
    setDialogAction(action)
  }

  const closeAction = () => {
    if (!mutation.isPending) {
      setDialogAction(null)
      setDialogItemId(null)
      mutation.reset()
    }
  }

  const submitAction = async (values: InventoryDialogValues) => {
    if (!dialogAction) return
    try {
      await mutation.mutateAsync({ action: dialogAction, item: dialogItem, values })
    } catch {
      // O diálogo apresenta somente a mensagem sanitizada.
    }
  }

  if (itemsQuery.isLoading) {
    return <FeedbackState type="loading" title="Carregando estoque" message="Consultando os itens." />
  }

  if (itemsQuery.error) {
    return (
      <FeedbackState
        type="error"
        title="Não foi possível carregar o estoque."
        message="Tente novamente em instantes."
        actionLabel="Tentar novamente"
        onAction={() => void itemsQuery.refetch()}
      />
    )
  }

  const selectedItem = detailQuery.data ?? selectedListItem
  const hasSearch = Boolean(search.trim())
  const filters: InventoryFilter[] = ['active', 'low', 'normal', 'empty', 'inactive']

  return (
    <div className="inventory-page">
      <header className="inventory-page__heading">
        <h1>Estoque</h1>
        {profile === 'ADMIN' && <Button variant="secondary" onClick={() => openAction('create')}>Novo item</Button>}
      </header>

      {feedback && (
        <div className="inventory-toast" role="status">
          <span>{feedback}</span>
          <button className="icon-button" onClick={() => setFeedback(null)} aria-label="Fechar mensagem"><X size={17} /></button>
        </div>
      )}

      {lowStockQuery.isError && (
        <div className="inventory-inline-warning" role="status">
          Não foi possível atualizar a lista oficial de itens abaixo do mínimo.
        </div>
      )}

      <div className="inventory-search">
        <Search size={20} aria-hidden="true" />
        <label className="sr-only" htmlFor="inventory-search">Buscar itens</label>
        <input
          id="inventory-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou código"
          autoComplete="off"
        />
        {search && <button className="icon-button" onClick={() => setSearch('')} aria-label="Limpar busca"><X size={18} /></button>}
      </div>

      <div className="inventory-filter-bar">
        <div className="inventory-filters" aria-label="Filtrar estoque">
          {filters.map((item) => (
            <button
              key={item}
              className={filter === item ? 'inventory-filter inventory-filter--active' : 'inventory-filter'}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {inventoryFilterLabels[item]}
            </button>
          ))}
        </div>
        <span className="inventory-result-count" role="status">
          {visibleItems.length} {visibleItems.length === 1 ? 'encontrado' : 'encontrados'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="inventory-empty" role="status">
          <p>Nenhum item cadastrado.</p>
          {profile === 'ADMIN' && <Button variant="secondary" onClick={() => openAction('create')}>Cadastrar item</Button>}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="inventory-empty" role="status">
          <p>{hasSearch ? `Nenhum item encontrado para “${search.trim()}”.` : 'Nenhum item neste filtro.'}</p>
          <Button variant="ghost" onClick={() => {
            if (hasSearch) setSearch('')
            else setFilter('active')
          }}>{hasSearch ? 'Limpar busca' : 'Limpar filtros'}</Button>
        </div>
      ) : (
        <section className="inventory-list" aria-label="Lista de itens de estoque">
          <div className="inventory-list__header" aria-hidden="true">
            <span>Item</span><span>Código</span><span>Quantidade</span><span>Mínimo</span>
            <span>Situação</span><span>Local</span><span>Ação</span>
          </div>
          {visibleItems.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              profile={profile}
              officialLowStockIds={officialLowStockIds}
              onOpen={(selected) => setSelectedItemId(selected.id)}
              onAction={(action, selected) => openAction(action, selected)}
            />
          ))}
        </section>
      )}

      {selectedItem && !dialogAction && (
        <InventoryDetailsPanel
          item={selectedItem}
          profile={profile}
          officialLowStockIds={officialLowStockIds}
          history={historyQuery.data}
          historyLoading={historyQuery.isLoading}
          historyError={historyQuery.isError}
          onRetryHistory={() => void historyQuery.refetch()}
          onClose={() => setSelectedItemId(null)}
          onAction={(action, item) => openAction(action, item)}
        />
      )}

      <InventoryActionDialog
        action={dialogAction}
        item={dialogItem}
        pending={mutation.isPending}
        requestError={mutationErrorMessage(mutation.error, dialogAction)}
        onClose={closeAction}
        onSubmit={submitAction}
      />
    </div>
  )
}
