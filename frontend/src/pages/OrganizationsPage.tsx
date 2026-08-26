import { ArrowRight, Building2, LogOut, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { FeedbackState } from '../components/FeedbackState'
import { Field } from '../components/Field'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError } from '../lib/api-client'
import { initials } from '../lib/format'
import { useAuth } from '../providers/AuthProvider'
import { useOrganization } from '../providers/OrganizationProvider'
import type { Organization } from '../types/api'

export function OrganizationsPage() {
  const { account, logout } = useAuth()
  const {
    organizations,
    isLoading,
    error,
    isCreating,
    selectOrganization,
    createOrganization,
    reload,
  } = useOrganization()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [creationError, setCreationError] = useState('')

  function handleSelect(organization: Organization) {
    if (organization.status !== 'ATIVO' || !organization.ativa) return
    selectOrganization(organization)
    navigate('/app/dashboard')
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreationError('')
    if (!name.trim()) {
      setCreationError('Informe o nome da organização.')
      return
    }
    try {
      await createOrganization(name.trim())
      setDialogOpen(false)
      setName('')
      navigate('/app/dashboard')
    } catch (caught) {
      setCreationError(caught instanceof ApiError ? caught.message : 'Não foi possível criar a organização.')
    }
  }

  return (
    <main className="organization-page">
      <header className="organization-page__header">
        <Brand />
        <div className="organization-page__account">
          <div className="avatar" aria-hidden="true">{initials(account?.nome ?? '')}</div>
          <div><strong>{account?.nome}</strong><span>{account?.email}</span></div>
          <button className="icon-button" onClick={() => void logout()} aria-label="Sair da conta"><LogOut size={19} /></button>
        </div>
      </header>

      <section className="organization-page__content">
        <div className="page-heading page-heading--center organization-page__heading">
          <h1 className="eyebrow organization-page__title">Seu ambiente de trabalho</h1>
        </div>

        {isLoading && <FeedbackState type="loading" title="Carregando organizações" message="Buscando seus vínculos ativos." />}
        {error && <FeedbackState type="error" title="Não foi possível carregar suas organizações" message="Tente novamente em alguns instantes." actionLabel="Tentar novamente" onAction={() => void reload()} />}

        {!isLoading && !error && (
          <>
            {organizations.length === 0 ? (
              <div className="organization-empty" role="status">
                <span className="organization-empty__icon" aria-hidden="true"><Building2 /></span>
                <div>
                  <h2>Nenhuma organização ainda</h2>
                  <p>Crie seu primeiro ambiente para organizar ferramentas, estoque e equipe.</p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus size={18} aria-hidden="true" /> Criar organização
                </Button>
              </div>
            ) : (
              <>
                <div className="organization-grid">
                  {organizations.map((organization) => {
                    const available = organization.status === 'ATIVO' && organization.ativa
                    return (
                      <button
                        className="organization-card"
                        key={organization.id}
                        onClick={() => handleSelect(organization)}
                        disabled={!available}
                      >
                        <span className="organization-card__icon"><Building2 aria-hidden="true" /></span>
                        <span className="organization-card__body">
                          <strong>{organization.nome}</strong>
                          <span className="organization-card__badges">
                            <StatusBadge status={organization.perfil} />
                            <StatusBadge status={organization.status} />
                          </span>
                          <span className="organization-card__access">
                            {available ? 'Acessar ambiente' : 'Acesso operacional indisponível'}
                          </span>
                        </span>
                        {available && <ArrowRight className="organization-card__arrow" size={19} aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
                <Button className="organization-page__create" variant="secondary" onClick={() => setDialogOpen(true)}>
                  <Plus size={18} aria-hidden="true" /> Criar organização
                </Button>
              </>
            )}
          </>
        )}
      </section>

      <Dialog open={dialogOpen} title="Novo ambiente" onClose={() => setDialogOpen(false)}>
        <form className="dialog-form" onSubmit={(event) => void handleCreate(event)}>
          {creationError && <div className="alert alert--error" role="alert">{creationError}</div>}
          <Field label="Nome da organização" name="organizationName" maxLength={120}
            placeholder="Ex.: Almoxarifado Central" value={name}
            onChange={(event) => setName(event.target.value)} autoFocus />
          <div className="dialog-form__actions">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isCreating}>Criar ambiente</Button>
          </div>
        </form>
      </Dialog>
    </main>
  )
}
