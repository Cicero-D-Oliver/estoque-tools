import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { MemberProfile, OrganizationMember } from '@/types/api';

export type TeamAction = 'approve' | 'profile' | 'remove';

export const teamKeys = {
  root: (organizationId: number) => ['organization', organizationId, 'team'] as const,
  members: (organizationId: number) => ['organization', organizationId, 'team', 'members'] as const,
  pending: (organizationId: number) => ['organization', organizationId, 'team', 'pending'] as const,
};

const organizationRequest = { organization: true } as const;

export const teamService = {
  listMembers: async (organizationId: number): Promise<OrganizationMember[]> => (
    await apiClient.get<OrganizationMember[]>(
      `/api/organizacoes/${organizationId}/membros`,
      organizationRequest,
    )
  ).data,
  listPending: async (organizationId: number): Promise<OrganizationMember[]> => (
    await apiClient.get<OrganizationMember[]>(
      `/api/organizacoes/${organizationId}/solicitacoes`,
      organizationRequest,
    )
  ).data,
  approve: async (
    organizationId: number,
    memberId: number,
    perfil: Exclude<MemberProfile, 'ADMIN'>,
  ): Promise<OrganizationMember> => (
    await apiClient.put<OrganizationMember>(
      `/api/organizacoes/${organizationId}/solicitacoes/${memberId}/aprovacao`,
      { perfil },
      organizationRequest,
    )
  ).data,
  updateProfile: async (
    organizationId: number,
    memberId: number,
    perfil: MemberProfile,
  ): Promise<OrganizationMember> => (
    await apiClient.put<OrganizationMember>(
      `/api/organizacoes/${organizationId}/membros/${memberId}/perfil`,
      { perfil },
      organizationRequest,
    )
  ).data,
  remove: async (organizationId: number, memberId: number): Promise<void> => {
    await apiClient.delete(
      `/api/organizacoes/${organizationId}/membros/${memberId}`,
      organizationRequest,
    );
  },
};

export async function invalidateTeamCaches(
  queryClient: QueryClient,
  organizationId: number,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['organization', organizationId] }),
    queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  ]);
}
