import { Construction } from 'lucide-react'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="placeholder-page">
      <Construction size={30} aria-hidden="true" />
      <span className="eyebrow">Próxima etapa</span>
      <h1>{title}</h1>
      <p>A navegação e a proteção desta área já estão prontas. A interface funcional será implementada em uma etapa dedicada, usando apenas dados reais da API.</p>
    </div>
  )
}
