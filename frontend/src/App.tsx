import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrganizationsPage } from './pages/OrganizationsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'
import { OrganizationRoute } from './routes/OrganizationRoute'
import { ProtectedRoute } from './routes/ProtectedRoute'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/organizacoes" element={<OrganizationsPage />} />
        <Route element={<OrganizationRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="ferramentas" element={<PlaceholderPage title="Ferramentas" />} />
            <Route path="estoque" element={<PlaceholderPage title="Estoque" />} />
            <Route path="movimentacoes" element={<PlaceholderPage title="Movimentações" />} />
            <Route path="equipe" element={<PlaceholderPage title="Equipe" />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
