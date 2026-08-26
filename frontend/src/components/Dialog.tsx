import { X } from 'lucide-react'
import { useEffect } from 'react'

interface DialogProps {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
}

export function Dialog({ open, title, children, onClose }: DialogProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <header>
          <h2 className="dialog__title" id="dialog-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar janela">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
