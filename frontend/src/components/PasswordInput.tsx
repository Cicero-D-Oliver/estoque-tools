import { Eye, EyeOff } from 'lucide-react'
import { useRef, useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  hint?: string
}

export function PasswordInput({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = id ?? props.name
  const messageId = inputId ? `${inputId}-message` : undefined

  function toggleVisibility() {
    const selectionStart = inputRef.current?.selectionStart
    const selectionEnd = inputRef.current?.selectionEnd
    setVisible((current) => !current)
    queueMicrotask(() => {
      inputRef.current?.focus()
      if (selectionStart != null && selectionEnd != null) {
        inputRef.current?.setSelectionRange(selectionStart, selectionEnd)
      }
    })
  }

  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input">
        <input
          ref={inputRef}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
        />
        <button
          type="button"
          className="password-input__toggle"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          onClick={toggleVisibility}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {(error || hint) && (
        <span id={messageId} className={error ? 'field__error' : 'field__hint'}>
          {error || hint}
        </span>
      )}
    </div>
  )
}
