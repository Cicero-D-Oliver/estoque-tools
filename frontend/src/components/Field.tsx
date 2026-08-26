import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, id, className = '', ...props }: FieldProps) {
  const inputId = id ?? props.name
  const messageId = inputId ? `${inputId}-message` : undefined

  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        {...props}
      />
      {(error || hint) && (
        <span id={messageId} className={error ? 'field__error' : 'field__hint'}>
          {error || hint}
        </span>
      )}
    </div>
  )
}
