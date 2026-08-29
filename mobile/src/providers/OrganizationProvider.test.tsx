import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { OrganizationProvider, useOrganization } from './OrganizationProvider';
import { authService } from '@/services/auth-service';
import { organizationService } from '@/services/organization-service';
import { secureSessionStorage } from '@/storage/secure-session';
import type { Account, MobileSession, Organization } from '@/types/api';

jest.mock('@/services/auth-service', () => ({
  authService: { login: jest.fn(), refresh: jest.fn(), me: jest.fn(), logout: jest.fn() },
}));
jest.mock('@/services/organization-service', () => ({
  organizationService: { list: jest.fn(), create: jest.fn() },
}));

const account: Account = {
  id: 1, nome: 'Maria', email: 'maria@example.com', ativo: true,
  senhaAlteradaEm: null, ultimoLoginEm: null,
};
const session: MobileSession = {
  tokenType: 'Bearer', accessToken: 'access', expiresIn: 900,
  expiresAt: '2026-08-28T12:15:00Z', refreshToken: 'refresh-new',
  refreshExpiresAt: '2026-09-27T12:00:00Z',
};
const organizationA: Organization = {
  id: 10, nome: 'Almoxarifado A', ativa: true, criadaEm: '2026-08-28T10:00:00',
  perfil: 'ADMIN', status: 'ATIVO',
};
const organizationB: Organization = {
  id: 20, nome: 'Almoxarifado B', ativa: true, criadaEm: '2026-08-28T10:00:00',
  perfil: 'OPERADOR', status: 'ATIVO',
};

async function setup() {
  await secureSessionStorage.setRefreshToken('refresh-old');
  jest.mocked(authService.refresh).mockResolvedValue(session);
  jest.mocked(authService.me).mockResolvedValue(account);
  jest.mocked(organizationService.list).mockResolvedValue([organizationA, organizationB]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider><OrganizationProvider>{children}</OrganizationProvider></AuthProvider>
    </QueryClientProvider>
  );
  const hook = await renderHook(useOrganization, { wrapper });
  await waitFor(() => expect(hook.result.current.organizations).toHaveLength(2));
  return { ...hook, queryClient };
}

beforeEach(() => jest.clearAllMocks());

test('lista ambientes reais da conta', async () => {
  const { result } = await setup();
  expect(result.current.organizations.map((item) => item.nome)).toEqual(['Almoxarifado A', 'Almoxarifado B']);
});

test('seleciona e persiste a organização ativa', async () => {
  const { result } = await setup();
  await act(() => result.current.selectOrganization(organizationA));
  await waitFor(() => expect(result.current.activeOrganization?.id).toBe(10));
  await expect(secureSessionStorage.getOrganizationId()).resolves.toBe(10);
});

test('cria organização e a torna ativa', async () => {
  const created = { ...organizationA, id: 30, nome: 'Novo Ambiente' };
  jest.mocked(organizationService.create).mockResolvedValue(created);
  const { result } = await setup();
  await act(() => result.current.createOrganization(' Novo Ambiente '));
  expect(jest.mocked(organizationService.create).mock.calls[0][0]).toBe('Novo Ambiente');
  await waitFor(() => expect(result.current.activeOrganization?.id).toBe(30));
});

test('remove o cache da organização anterior ao alternar ambientes', async () => {
  const { result, queryClient } = await setup();
  await act(() => result.current.selectOrganization(organizationA));
  queryClient.setQueryData(['organization', 10, 'dashboard'], { private: 'A' });

  await act(() => result.current.selectOrganization(organizationB));

  await waitFor(() => expect(queryClient.getQueryData(['organization', 10, 'dashboard'])).toBeUndefined());
  await waitFor(() => expect(result.current.activeOrganization?.id).toBe(20));
});

test('não seleciona vínculo pendente ou organização inativa', async () => {
  const { result } = await setup();
  const unavailable = { ...organizationA, status: 'PENDENTE' as const };
  await expect(result.current.selectOrganization(unavailable)).rejects.toThrow('não está disponível');
});
