import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { organizationStore } from '../lib/organization-store'
import { organizationService } from '../services/organization-service'
import type { Organization } from '../types/api'
import { useAuth } from './AuthProvider'

interface OrganizationContextValue {
  organizations: Organization[]
  selectedOrganization: Organization | null
  isLoading: boolean
  error: Error | null
  isCreating: boolean
  selectOrganization: (organization: Organization) => void
  createOrganization: (name: string) => Promise<Organization>
  reload: () => Promise<unknown>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(organizationStore.get())

  useEffect(() => organizationStore.subscribe(setSelectedId), [])

  const query = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationService.list,
    enabled: status === 'authenticated',
  })

  const organizations = query.data ?? []
  const selectedOrganization = organizations.find((organization) => organization.id === selectedId) ?? null

  useEffect(() => {
    if (status !== 'authenticated') {
      organizationStore.clear()
    } else if (selectedId && query.data && !selectedOrganization) {
      organizationStore.clear()
    }
  }, [query.data, selectedId, selectedOrganization, status])

  const creation = useMutation({
    mutationFn: organizationService.create,
    onSuccess: (organization) => {
      queryClient.setQueryData<Organization[]>(['organizations'], (current = []) => [
        ...current.filter((item) => item.id !== organization.id),
        organization,
      ])
      organizationStore.set(organization.id)
    },
  })

  const value = useMemo<OrganizationContextValue>(() => ({
    organizations,
    selectedOrganization,
    isLoading: query.isLoading,
    error: query.error,
    isCreating: creation.isPending,
    selectOrganization: (organization) => organizationStore.set(organization.id),
    createOrganization: (name) => creation.mutateAsync(name),
    reload: query.refetch,
  }), [creation, organizations, query.error, query.isLoading, query.refetch, selectedOrganization])

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) throw new Error('useOrganization deve ser usado dentro de OrganizationProvider')
  return context
}
