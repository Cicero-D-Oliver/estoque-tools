import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { setActiveOrganizationId } from '@/api/session-coordinator';
import { organizationService } from '@/services/organization-service';
import { secureSessionStorage } from '@/storage/secure-session';
import type { Organization } from '@/types/api';
import { useAuth } from './AuthProvider';

interface OrganizationContextValue {
  organizations: Organization[];
  activeOrganization: Organization | null;
  isLoading: boolean;
  error: Error | null;
  selectOrganization: (organization: Organization) => Promise<void>;
  leaveOrganization: () => Promise<void>;
  createOrganization: (nome: string) => Promise<Organization>;
  refreshOrganizations: () => Promise<unknown>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const organizationsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationService.list,
    enabled: status === 'authenticated',
  });
  const activeIdQuery = useQuery({
    queryKey: ['active-organization-id'],
    queryFn: secureSessionStorage.getOrganizationId,
    enabled: status === 'authenticated',
    staleTime: Infinity,
  });

  const organizations = organizationsQuery.data ?? [];
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeIdQuery.data
      && organization.status === 'ATIVO'
      && organization.ativa,
  ) ?? null;

  useEffect(() => {
    setActiveOrganizationId(activeOrganization?.id ?? null);
  }, [activeOrganization?.id]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setActiveOrganizationId(null);
      queryClient.removeQueries({ queryKey: ['organizations'] });
      queryClient.removeQueries({ queryKey: ['active-organization-id'] });
    }
  }, [queryClient, status]);

  const selectOrganization = useCallback(async (organization: Organization) => {
    if (!organization.ativa || organization.status !== 'ATIVO') {
      throw new Error('Este ambiente não está disponível.');
    }
    const previousId = queryClient.getQueryData<number | null>(['active-organization-id']);
    if (previousId && previousId !== organization.id) {
      queryClient.removeQueries({ queryKey: ['organization', previousId] });
    }
    await secureSessionStorage.setOrganizationId(organization.id);
    queryClient.setQueryData(['active-organization-id'], organization.id);
    setActiveOrganizationId(organization.id);
  }, [queryClient]);

  const leaveOrganization = useCallback(async () => {
    const previousId = queryClient.getQueryData<number | null>(['active-organization-id']);
    if (previousId) queryClient.removeQueries({ queryKey: ['organization', previousId] });
    await secureSessionStorage.clearOrganization();
    queryClient.setQueryData(['active-organization-id'], null);
    setActiveOrganizationId(null);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: organizationService.create,
    onSuccess: (organization) => {
      queryClient.setQueryData<Organization[]>(['organizations'], (current = []) => [
        ...current,
        organization,
      ]);
    },
  });

  const createOrganization = useCallback(async (nome: string) => {
    const organization = await createMutation.mutateAsync(nome.trim());
    await selectOrganization(organization);
    return organization;
  }, [createMutation, selectOrganization]);

  const value = useMemo<OrganizationContextValue>(() => ({
    organizations,
    activeOrganization,
    isLoading: organizationsQuery.isLoading || activeIdQuery.isLoading,
    error: organizationsQuery.error,
    selectOrganization,
    leaveOrganization,
    createOrganization,
    refreshOrganizations: organizationsQuery.refetch,
  }), [
    activeIdQuery.isLoading,
    activeOrganization,
    createOrganization,
    leaveOrganization,
    organizations,
    organizationsQuery.error,
    organizationsQuery.isLoading,
    organizationsQuery.refetch,
    selectOrganization,
  ]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization deve ser usado dentro de OrganizationProvider');
  return context;
}
