import axios from 'axios';
import type { MemberProfile, MemberStatus, OrganizationMember } from '@/types/api';
import { normalizeToolSearch } from '@/features/tools/tool-ui';

export type TeamFilter = 'all' | 'active' | 'pending';

export const teamFilterLabels: Record<TeamFilter, string> = {
  all: 'Todos',
  active: 'Ativos',
  pending: 'Aguardando aprovação',
};

export const profileLabels: Record<MemberProfile, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  CONSULTA: 'Consulta',
};

export const memberStatusLabels: Record<MemberStatus, string> = {
  ATIVO: 'Ativo',
  PENDENTE: 'Aguardando aprovação',
  REJEITADO: 'Rejeitado',
  REMOVIDO: 'Acesso removido',
};

export function canAccessTeam(profile: MemberProfile): boolean {
  return profile === 'ADMIN';
}

export function combineMembers(
  members: OrganizationMember[],
  pending: OrganizationMember[],
  organizationId: number,
): OrganizationMember[] {
  const byId = new Map(members.map((member) => [member.id, member]));
  pending.forEach((member) => byId.set(member.id, member));
  return [...byId.values()]
    .filter((member) => member.organizacaoId === organizationId)
    .sort((left, right) => left.usuarioNome.localeCompare(right.usuarioNome, 'pt-BR') || left.id - right.id);
}

export function filterMembers(
  members: OrganizationMember[],
  filter: TeamFilter,
  search: string,
): OrganizationMember[] {
  const term = normalizeToolSearch(search);
  return members.filter((member) => {
    const matchesFilter = filter === 'all'
      || (filter === 'active' && member.status === 'ATIVO')
      || (filter === 'pending' && member.status === 'PENDENTE');
    if (!matchesFilter) return false;
    return !term || normalizeToolSearch(`${member.usuarioNome} ${member.usuarioEmail}`).includes(term);
  });
}

export function isLastActiveAdmin(
  member: OrganizationMember,
  members: OrganizationMember[],
): boolean {
  return member.status === 'ATIVO'
    && member.perfil === 'ADMIN'
    && members.filter((candidate) => candidate.status === 'ATIVO' && candidate.perfil === 'ADMIN').length === 1;
}

export function teamRequestError(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Não foi possível atualizar o acesso.';
  if (!error.response) return 'Sem conexão com o servidor.';
  if (error.response.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (error.response.status === 403) return 'Você não pode realizar esta ação.';
  if (error.response.status === 409) return 'Os dados foram alterados. Atualize a tela.';
  const payload = error.response.data as { mensagem?: string };
  if (/ao menos um ADMIN/i.test(payload?.mensagem ?? '')) {
    return 'Este ambiente precisa manter ao menos um administrador.';
  }
  return 'Não foi possível atualizar o acesso.';
}
