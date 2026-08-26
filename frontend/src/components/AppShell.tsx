import {
  Boxes,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  PackageOpen,
  UsersRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { initials } from '../lib/format'
import { useAuth } from '../providers/AuthProvider'
import { useOrganization } from '../providers/OrganizationProvider'
import { Brand } from './Brand'
import { OrganizationSwitcher } from './OrganizationSwitcher'
import { StatusBadge } from './StatusBadge'

const navigation = [
  { to: '/app/dashboard', label: 'Início', icon: Gauge },
  { to: '/app/ferramentas', label: 'Ferramentas', icon: Boxes },
  { to: '/app/estoque', label: 'Estoque', icon: PackageOpen },
  { to: '/app/movimentacoes', label: 'Movimentações', icon: ClipboardList },
  { to: '/app/equipe', label: 'Equipe', icon: UsersRound, adminOnly: true },
]

export function AppShell() {
  const { account, logout } = useAuth()
  const { selectedOrganization } = useOrganization()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const current = navigation.find((item) => location.pathname.startsWith(item.to))

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <Brand />
          <button className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            <X size={21} />
          </button>
        </div>
        <nav aria-label="Navegação principal">
          <span className="sidebar__section">Gestão</span>
          {navigation
            .filter((item) => !item.adminOnly || selectedOrganization?.perfil === 'ADMIN')
            .map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar__account">
          <div className="avatar" aria-hidden="true">{initials(account?.nome ?? '')}</div>
          <div>
            <strong>{account?.nome}</strong>
            <span>{account?.email}</span>
          </div>
          <button className="icon-button" onClick={() => void logout()} aria-label="Sair da conta" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-overlay" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}

      <div className="app-shell__body">
        <header className="topbar">
          <div className="topbar__title">
            <button className="icon-button topbar__menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <Menu size={22} />
            </button>
            <div>
              <strong>{current?.label ?? 'Estoque Tools'}</strong>
            </div>
          </div>
          <div className="topbar__actions">
            {selectedOrganization && <StatusBadge status={selectedOrganization.perfil} />}
            <OrganizationSwitcher />
          </div>
        </header>
        <main className="app-content" id="conteudo-principal">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
