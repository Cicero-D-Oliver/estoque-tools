import { apiClient } from '../lib/api-client'
import type { MemberProfile, OrganizationMember } from '../types/api'

const organizationRequest = { organization: true } as const

export const teamKeys = {
  all: ['team'] as const,
  members: (organizationId: number) => ['team', organizationId, 'members'] as const,
  pending: (organizationId: number) => ['team', organizationId, 'pending'] as const,
}

export const teamService = {
  listMembers: (organizationId: number) => apiClient.get<OrganizationMember[]>(
    `/api/organizacoes/${organizationId}/membros`,
    organizationRequest,
  ),
  listPending: (organizationId: number) => apiClient.get<OrganizationMember[]>(
    `/api/organizacoes/${organizationId}/solicitacoes`,
    organizationRequest,
  ),
  approve: (organizationId: number, memberId: number, perfil: Exclude<MemberProfile, 'ADMIN'>) => (
    apiClient.put<OrganizationMember>(
      `/api/organizacoes/${organizationId}/solicitacoes/${memberId}/aprovacao`,
      { perfil },
      organizationRequest,
    )
  ),
  updateProfile: (organizationId: number, memberId: number, perfil: MemberProfile) => (
    apiClient.put<OrganizationMember>(
      `/api/organizacoes/${organizationId}/membros/${memberId}/perfil`,
      { perfil },
      organizationRequest,
    )
  ),
  remove: (organizationId: number, memberId: number) => apiClient.delete<void>(
    `/api/organizacoes/${organizationId}/membros/${memberId}`,
    organizationRequest,
  ),
}
