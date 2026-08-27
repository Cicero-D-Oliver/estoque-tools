import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { Dialog } from '../Dialog'
import { profileLabels } from '../../lib/team-ui'
import type { MemberProfile, OrganizationMember } from '../../types/api'

export type TeamAction = 'approve' | 'profile' | 'remove'

const titles: Record<TeamAction, string> = {
  approve: 'Aprovar acesso',
  profile: 'Alterar perfil',
  remove: 'Remover acesso',
}

export function TeamActionDialog({
  action,
  member,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  action: TeamAction | null
  member: OrganizationMember | null
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (profile?: MemberProfile) => void
}) {
  const [profile, setProfile] = useState<MemberProfile>('OPERADOR')

  useEffect(() => {
    setProfile(action === 'profile' && member ? member.perfil : 'OPERADOR')
  }, [action, member])

  if (!action) return null
  const approval = action === 'approve'

  return (
    <Dialog open title={titles[action]} onClose={onClose}>
      <div className="dialog-form">
        {member && action === 'remove' && (
          <p className="team-action-person">
            <strong>{member.usuarioNome}</strong>
            <span>{member.usuarioEmail}</span>
          </p>
        )}
        {member && action !== 'remove' && <p className="team-action-person"><span>{member.usuarioEmail}</span></p>}
        {action === 'remove' ? (
          <p className="team-action-copy">Esta pessoa perderá o acesso a este ambiente. A conta não será excluída.</p>
        ) : (
          <label className="field">
            <span>Perfil</span>
            <select value={profile} onChange={(event) => setProfile(event.target.value as MemberProfile)}>
              {!approval && <option value="ADMIN">{profileLabels.ADMIN}</option>}
              <option value="OPERADOR">{profileLabels.OPERADOR}</option>
              <option value="CONSULTA">{profileLabels.CONSULTA}</option>
            </select>
          </label>
        )}
        {error && <p className="form-alert" role="alert">{error}</p>}
        <div className="dialog-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button
            type="button"
            variant={action === 'remove' ? 'danger' : 'primary'}
            onClick={() => onSubmit(action === 'remove' ? undefined : profile)}
            loading={pending}
          >
            {action === 'approve' ? 'Aprovar' : action === 'profile' ? 'Salvar' : 'Remover acesso'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
