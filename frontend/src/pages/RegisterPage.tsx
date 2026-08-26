import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { PasswordInput } from '../components/PasswordInput'
import { ApiError } from '../lib/api-client'
import { useAuth } from '../providers/AuthProvider'

type RegisterErrors = Partial<Record<'nome' | 'email' | 'senha', string>>

export function RegisterPage() {
  const { register, status } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [submitError, setSubmitError] = useState('')

  function validate() {
    const next: RegisterErrors = {}
    if (!form.nome.trim()) next.nome = 'Informe seu nome.'
    if (!form.email.trim()) next.email = 'Informe seu e-mail.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Informe um e-mail válido.'
    if (form.senha.length < 12 || form.senha.length > 72) next.senha = 'Use entre 12 e 72 caracteres.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return
    try {
      await register({ nome: form.nome.trim(), email: form.email.trim(), senha: form.senha })
      navigate('/organizacoes', { replace: true })
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Não foi possível criar sua conta. Tente novamente.')
    }
  }

  return (
    <AuthLayout title="Crie seu acesso" subtitle="Comece com uma conta e configure seu primeiro ambiente.">
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {submitError && <div className="alert alert--error" role="alert">{submitError}</div>}
        <Field label="Nome completo" name="nome" autoComplete="name" placeholder="Seu nome"
          value={form.nome} error={errors.nome}
          onChange={(event) => setForm({ ...form, nome: event.target.value })} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com"
          value={form.email} error={errors.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <PasswordInput label="Senha" name="senha" autoComplete="new-password"
          hint="Use de 12 a 72 caracteres." value={form.senha} error={errors.senha}
          onChange={(event) => setForm({ ...form, senha: event.target.value })} />
        <Button type="submit" loading={status === 'authenticating'}>Criar minha conta</Button>
        <p className="auth-form__switch">Já possui uma conta? <Link to="/login">Entrar</Link></p>
      </form>
    </AuthLayout>
  )
}
