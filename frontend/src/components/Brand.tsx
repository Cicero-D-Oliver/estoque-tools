import { Boxes } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Estoque Tools">
      <span className="brand__mark" aria-hidden="true"><Boxes size={23} strokeWidth={2.2} /></span>
      {!compact && (
        <span className="brand__name">
          <strong>ESTOQUE</strong>
          <span>TOOLS</span>
        </span>
      )}
    </div>
  )
}
