import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { PasswordInput } from '../components/PasswordInput'
import { ApiError } from '../lib/api-client'
import { useAuth } from '../providers/AuthProvider'
import { onboardingService } from '../services/onboarding-service'

interface LoginFormErrors {
  email?: string
  senha?: string
}

export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false)

  useEffect(() => {
    let active = true
    void onboardingService.bootstrapStatus()
      .then((response) => { if (active) setBootstrapAvailable(response.disponivel) })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/organizacoes', { replace: true })
    }
  }, [navigate, status])

  function validate() {
    const nextErrors: LoginFormErrors = {}
    if (!email.trim()) nextErrors.email = 'Informe seu e-mail.'
    else if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Informe um e-mail válido.'
    if (!senha) nextErrors.senha = 'Informe sua senha.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return

    try {
      await login({ email: email.trim(), senha })
      const destination = (location.state as { from?: string } | null)?.from
      navigate(destination && destination !== '/login' ? destination : '/organizacoes', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        setSubmitError('Não foi possível conectar ao servidor. Verifique sua rede e tente novamente.')
      } else {
        setSubmitError('E-mail ou senha incorretos.')
      }
    }
  }

  return (
    <AuthLayout compact>
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordInput
          label="Senha"
          name="senha"
          autoComplete="current-password"
          placeholder="Digite sua senha"
          value={senha}
          error={errors.senha}
          onChange={(event) => setSenha(event.target.value)}
        />
        <Button type="submit" loading={status === 'authenticating'}>
          Entrar
        </Button>
        {bootstrapAvailable && (
          <Link className="auth-form__switch auth-form__switch--link" to="/ativar-admin">
            Ativar administrador inicial
          </Link>
        )}
      </form>
    </AuthLayout>
  )
}
