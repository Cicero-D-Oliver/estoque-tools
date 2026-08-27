import type { MemberProfile, MemberStatus, OrganizationMember } from '../types/api'
import { normalizedSearch } from './tool-ui'

export type TeamFilter = 'all' | 'active' | 'pending'

export const teamFilterLabels: Record<TeamFilter, string> = {
  all: 'Todos',
  active: 'Ativos',
  pending: 'Aguardando aprovação',
}

export const profileLabels: Record<MemberProfile, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  CONSULTA: 'Consulta',
}

export const memberStatusLabels: Record<MemberStatus, string> = {
  ATIVO: 'Ativo',
  PENDENTE: 'Aguardando aprovação',
  REJEITADO: 'Rejeitado',
  REMOVIDO: 'Acesso removido',
}

export function combineMembers(
  members: OrganizationMember[],
  pending: OrganizationMember[],
): OrganizationMember[] {
  const byId = new Map(members.map((member) => [member.id, member]))
  pending.forEach((member) => byId.set(member.id, member))
  return [...byId.values()].sort((left, right) => (
    left.usuarioNome.localeCompare(right.usuarioNome, 'pt-BR') || left.id - right.id
  ))
}

export function filterMembers(
  members: OrganizationMember[],
  filter: TeamFilter,
  search: string,
): OrganizationMember[] {
  const term = normalizedSearch(search)
  return members.filter((member) => {
    const matchesFilter = filter === 'all'
      || (filter === 'active' && member.status === 'ATIVO')
      || (filter === 'pending' && member.status === 'PENDENTE')
    if (!matchesFilter) return false
    return !term || normalizedSearch(`${member.usuarioNome} ${member.usuarioEmail}`).includes(term)
  })
}
