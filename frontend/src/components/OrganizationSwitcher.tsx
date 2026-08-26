import { Building2, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../providers/OrganizationProvider'

export function OrganizationSwitcher() {
  const { organizations, selectedOrganization, selectOrganization } = useOrganization()
  const navigate = useNavigate()

  return (
    <div className="organization-switcher">
      <Building2 size={18} aria-hidden="true" />
      <label className="sr-only" htmlFor="organization-switcher">Organização atual</label>
      <select
        id="organization-switcher"
        value={selectedOrganization?.id ?? ''}
        onChange={(event) => {
          const organization = organizations.find((item) => item.id === Number(event.target.value))
          if (organization) {
            selectOrganization(organization)
            navigate('/app/dashboard')
          }
        }}
      >
        {organizations.filter((item) => item.status === 'ATIVO').map((organization) => (
          <option key={organization.id} value={organization.id}>{organization.nome}</option>
        ))}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </div>
  )
}
