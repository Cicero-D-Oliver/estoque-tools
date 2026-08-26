import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../providers/AuthProvider'
import { ProtectedRoute } from './ProtectedRoute'

it('redireciona uma rota protegida para login sem sessão', () => {
  const queryClient = new QueryClient()
  render(
    <MemoryRouter initialEntries={['/restrita']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/restrita" element={<h1>Área restrita</h1>} />
            </Route>
            <Route path="/login" element={<h1>Login seguro</h1>} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: 'Login seguro' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Área restrita' })).not.toBeInTheDocument()
})
