import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../providers/AuthProvider'
import { OrganizationProvider } from '../providers/OrganizationProvider'

export function renderWithProviders(ui: React.ReactNode, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrganizationProvider>{ui}</OrganizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
