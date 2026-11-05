import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { ApiError } from '../lib/api-client'
import { onboardingService } from '../services/onboarding-service'

export function BootstrapPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Informe um e-mail válido.')
      return
    }
    setPending(true)
    try {
      const response = await onboardingService.requestBootstrap(email.trim())
      setMessage(response.mensagem)
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : 'Não foi possível solicitar a ativação.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout compact>
      <Link className="auth-back-link" to="/login" aria-label="Voltar para o login">
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>
      <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
        <h1>Ativar administrador inicial</h1>
        {message && <div className="alert alert--success" role="status">{message}</div>}
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <Field
          label="E-mail"
          name="bootstrap-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" loading={pending}>Enviar link de ativação</Button>
      </form>
    </AuthLayout>
  )
}
