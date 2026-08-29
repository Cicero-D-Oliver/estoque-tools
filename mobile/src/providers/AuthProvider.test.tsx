import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthProvider';
import { authService } from '@/services/auth-service';
import { secureSessionStorage } from '@/storage/secure-session';
import { getAccessToken, refreshAccessToken, resetSessionCoordinator } from '@/api/session-coordinator';
import type { Account, MobileSession } from '@/types/api';

jest.mock('@/services/auth-service', () => ({
  authService: {
    login: jest.fn(),
    refresh: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  },
}));

const account: Account = {
  id: 7,
  nome: 'Ana Operadora',
  email: 'ana@example.com',
  ativo: true,
  senhaAlteradaEm: null,
  ultimoLoginEm: null,
};

const session = (suffix: string): MobileSession => ({
  tokenType: 'Bearer',
  accessToken: `access-${suffix}`,
  expiresIn: 900,
  expiresAt: '2026-08-28T12:15:00Z',
  refreshToken: `refresh-${suffix}`,
  refreshExpiresAt: '2026-09-27T12:00:00Z',
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetSessionCoordinator();
  jest.mocked(authService.me).mockResolvedValue(account);
});

test('entra como anônimo quando não existe refresh token', async () => {
  const { result } = await renderHook(useAuth, { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.status).toBe('anonymous'));
  expect(authService.refresh).not.toHaveBeenCalled();
});

test('restaura a sessão e salva o refresh rotacionado', async () => {
  await secureSessionStorage.setRefreshToken('refresh-antigo');
  jest.mocked(authService.refresh).mockResolvedValue(session('restored'));
  const { result } = await renderHook(useAuth, { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.status).toBe('authenticated'));
  expect(result.current.account).toEqual(account);
  expect(getAccessToken()).toBe('access-restored');
  await expect(secureSessionStorage.getRefreshToken()).resolves.toBe('refresh-restored');
});

test('realiza login pelo contrato mobile e mantém access token em memória', async () => {
  jest.mocked(authService.login).mockResolvedValue(session('login'));
  const { result } = await renderHook(useAuth, { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.status).toBe('anonymous'));

  await act(() => result.current.login('ANA@EXAMPLE.COM ', 'senha'));

  expect(authService.login).toHaveBeenCalledWith('ana@example.com', 'senha');
  expect(getAccessToken()).toBe('access-login');
  expect(result.current.status).toBe('authenticated');
});

test('rotaciona refresh durante renovação disparada pelo cliente HTTP', async () => {
  await secureSessionStorage.setRefreshToken('refresh-atual');
  jest.mocked(authService.refresh).mockResolvedValue(session('rotated'));
  await renderHook(useAuth, { wrapper: createWrapper() });
  await waitFor(() => expect(authService.refresh).toHaveBeenCalled());

  await act(async () => { await refreshAccessToken(); });

  expect(getAccessToken()).toBe('access-rotated');
  await expect(secureSessionStorage.getRefreshToken()).resolves.toBe('refresh-rotated');
});

test('logout revoga a sessão e limpa credenciais locais', async () => {
  jest.mocked(authService.login).mockResolvedValue(session('logout'));
  jest.mocked(authService.logout).mockResolvedValue({} as never);
  const { result } = await renderHook(useAuth, { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.status).toBe('anonymous'));
  await act(() => result.current.login(account.email, 'senha'));

  await act(() => result.current.logout());

  expect(authService.logout).toHaveBeenCalledWith('refresh-logout');
  expect(getAccessToken()).toBeNull();
  await expect(secureSessionStorage.getRefreshToken()).resolves.toBeNull();
  expect(result.current.status).toBe('anonymous');
});
