import { ShieldCheck, Warehouse } from 'lucide-react'
import { Brand } from './Brand'

export function AuthLayout({ children, title, subtitle, compact = false }: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  compact?: boolean
}) {
  return (
    <main className={`auth-layout${compact ? ' auth-layout--compact' : ''}`}>
      {!compact && (
        <section className="auth-hero" aria-label="Apresentação do produto">
          <div className="auth-hero__grid" aria-hidden="true" />
          <Brand />
          <div className="auth-hero__content">
            <span className="auth-hero__icon" aria-hidden="true"><Warehouse size={30} /></span>
            <p className="eyebrow">Controle que acompanha a operação</p>
            <h1>Seu estoque organizado.<br />Sua equipe em movimento.</h1>
            <p>Ferramentas, responsáveis e movimentações reunidos em uma visão segura para cada organização.</p>
          </div>
          <div className="auth-hero__trust">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Sessão protegida e isolamento por organização</span>
          </div>
        </section>
      )}
      <section className="auth-panel">
        <div className="auth-panel__mobile-brand"><Brand /></div>
        <div className="auth-card">
          {!compact && (
            <div className="auth-card__heading">
              <span className="eyebrow">Acesso seguro</span>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          )}
          {children}
        </div>
      </section>
    </main>
  )
}
