import { Navigate, Outlet } from 'react-router-dom'
import { FeedbackState } from '../components/FeedbackState'
import { useOrganization } from '../providers/OrganizationProvider'

export function OrganizationRoute() {
  const { selectedOrganization, isLoading } = useOrganization()

  if (isLoading) {
    return <FeedbackState type="loading" title="Carregando seu ambiente" message="Estamos preparando suas organizações." />
  }

  if (!selectedOrganization) {
    return <Navigate to="/organizacoes" replace />
  }

  return <Outlet />
}
