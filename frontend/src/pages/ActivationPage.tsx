import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { PasswordInput } from '../components/PasswordInput'
import { ApiError } from '../lib/api-client'
import { onboardingService, type ActivationPreview } from '../services/onboarding-service'

const stateMessages: Record<Exclude<ActivationPreview['estado'], 'VALIDO'>, string> = {
  EXPIRADO: 'Este link expirou. Solicite um novo convite ao administrador.',
  UTILIZADO: 'Este link já foi utilizado.',
  INVALIDO: 'Este link de ativação não é válido.',
}

export function ActivationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [preview, setPreview] = useState<ActivationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({ nome: '', senha: '', confirmacaoSenha: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    void onboardingService.preview(token)
      .then((response) => { if (active) setPreview(response) })
      .catch(() => { if (active) setPreview({ estado: 'INVALIDO', email: null, organizacao: null, requerCriacaoConta: false }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (preview?.requerCriacaoConta) {
      if (!form.nome.trim()) return setError('Informe seu nome.')
      if (form.senha.length < 12 || form.senha.length > 72) return setError('Use uma senha entre 12 e 72 caracteres.')
      if (form.senha !== form.confirmacaoSenha) return setError('As senhas não coincidem.')
    }
    setPending(true)
    try {
      const response = await onboardingService.complete({
        token,
        ...(preview?.requerCriacaoConta ? { ...form, nome: form.nome.trim() } : {}),
      })
      setSuccess(response.mensagem)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível ativar o acesso.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout compact>
      <div className="auth-form activation-page">
        <h1>Ativar acesso</h1>
        {loading && <p role="status">Validando convite...</p>}
        {!loading && preview && preview.estado !== 'VALIDO' && (
          <div className="alert alert--error" role="alert">{stateMessages[preview.estado]}</div>
        )}
        {!loading && preview?.estado === 'VALIDO' && !success && (
          <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
            <p><strong>{preview.email}</strong></p>
            <p>{preview.organizacao}</p>
            {preview.requerCriacaoConta && (
              <>
                <Field label="Nome completo" name="nome" autoComplete="name" value={form.nome}
                  onChange={(event) => setForm({ ...form, nome: event.target.value })} />
                <PasswordInput label="Senha" name="senha" autoComplete="new-password" value={form.senha}
                  hint="12 a 72 caracteres"
                  onChange={(event) => setForm({ ...form, senha: event.target.value })} />
                <PasswordInput label="Confirmar senha" name="confirmacaoSenha" autoComplete="new-password"
                  value={form.confirmacaoSenha}
                  onChange={(event) => setForm({ ...form, confirmacaoSenha: event.target.value })} />
              </>
            )}
            {error && <div className="alert alert--error" role="alert">{error}</div>}
            <Button type="submit" loading={pending}>Ativar acesso</Button>
          </form>
        )}
        {success && <div className="alert alert--success" role="status">{success}</div>}
        {!loading && (success || preview?.estado !== 'VALIDO') && (
          <Link className="auth-form__switch auth-form__switch--link" to="/login">Voltar para o login</Link>
        )}
      </div>
    </AuthLayout>
  )
}
