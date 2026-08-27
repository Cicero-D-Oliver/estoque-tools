import { Navigate, Outlet } from 'react-router-dom'
import { useOrganization } from '../providers/OrganizationProvider'

export function AdminOrganizationRoute() {
  const { selectedOrganization } = useOrganization()
  if (selectedOrganization?.perfil !== 'ADMIN') {
    return <Navigate to="/app/dashboard" replace />
  }
  return <Outlet />
}
