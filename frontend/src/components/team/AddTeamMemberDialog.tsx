import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import { Field } from '../Field'
import type { MemberProfile } from '../../types/api'

const CORPORATE_DOMAIN = 'scaladatacenters.com'

export function AddTeamMemberDialog({
  open,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (email: string, profile: Exclude<MemberProfile, 'ADMIN'>) => void
}) {
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Exclude<MemberProfile, 'ADMIN'>>('OPERADOR')
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (!open) return
    setEmail('')
    setProfile('OPERADOR')
    setEmailError('')
  }, [open])

  if (!open) return null

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const domain = normalizedEmail.slice(normalizedEmail.lastIndexOf('@') + 1)
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || domain !== CORPORATE_DOMAIN) {
      setEmailError(`Use o e-mail corporativo @${CORPORATE_DOMAIN}.`)
      return
    }
    setEmailError('')
    onSubmit(normalizedEmail, profile)
  }

  return (
    <Dialog open title="Convidar pessoa" onClose={onClose}>
      <form className="dialog-form" onSubmit={submit} noValidate>
        <Field
          label="E-mail corporativo"
          name="team-member-email"
          type="email"
          autoComplete="email"
          placeholder={`nome@${CORPORATE_DOMAIN}`}
          hint={`Use um endereço @${CORPORATE_DOMAIN}.`}
          value={email}
          error={emailError}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label className="field">
          <span>Perfil</span>
          <select value={profile} onChange={(event) => setProfile(event.target.value as Exclude<MemberProfile, 'ADMIN'>)}>
            <option value="OPERADOR">Operador</option>
            <option value="CONSULTA">Consulta</option>
          </select>
        </label>
        {error && <div className="form-alert" role="alert"><span>{error}</span></div>}
        <div className="dialog-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button type="submit" loading={pending}>Enviar convite</Button>
        </div>
      </form>
    </Dialog>
  )
}
