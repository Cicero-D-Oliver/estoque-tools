import { AlertTriangle, CheckCircle2, Inbox, LoaderCircle } from 'lucide-react'
import { Button } from './Button'

interface FeedbackStateProps {
  type: 'loading' | 'error' | 'empty' | 'success'
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

const icons = {
  loading: LoaderCircle,
  error: AlertTriangle,
  empty: Inbox,
  success: CheckCircle2,
}

export function FeedbackState({ type, title, message, actionLabel, onAction }: FeedbackStateProps) {
  const Icon = icons[type]
  return (
    <div className={`feedback feedback--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon className={type === 'loading' ? 'feedback__spinner' : ''} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {actionLabel && onAction && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
