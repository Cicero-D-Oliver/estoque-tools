import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { TeamScreen } from './TeamScreen';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { invalidateTeamCaches, teamService } from '@/services/team-service';

jest.mock('@/providers/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/providers/OrganizationProvider', () => ({ useOrganization: jest.fn() }));
jest.mock('@/services/team-service', () => ({
  teamKeys: {
    members: (organizationId: number) => ['organization', organizationId, 'team', 'members'],
    pending: (organizationId: number) => ['organization', organizationId, 'team', 'pending'],
    invitations: (organizationId: number) => ['organization', organizationId, 'team', 'invitations'],
  },
  teamService: {
    listMembers: jest.fn(),
    listPending: jest.fn(),
    listInvitations: jest.fn(),
    invite: jest.fn(),
    approve: jest.fn(),
    updateProfile: jest.fn(),
    remove: jest.fn(),
  },
  invalidateTeamCaches: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({ account: { id: 1 } } as never);
  jest.mocked(useOrganization).mockReturnValue({
    activeOrganization: {
      id: 12,
      nome: 'Almoxarifado Central',
      perfil: 'ADMIN',
      status: 'ATIVO',
      ativa: true,
      criadaEm: '2026-01-01T00:00:00Z',
    },
  } as never);
  jest.mocked(teamService.listMembers).mockResolvedValue([]);
  jest.mocked(teamService.listPending).mockResolvedValue([]);
  jest.mocked(teamService.listInvitations).mockResolvedValue([]);
  jest.mocked(teamService.invite).mockResolvedValue({
    id: 4,
    email: 'ana@scaladatacenters.com',
    perfil: 'OPERADOR',
    status: 'PENDENTE',
    enviadoEm: '2026-11-03T12:00:00Z',
    expiraEm: '2026-11-03T12:30:00Z',
    confirmadoEm: null,
  });
  jest.mocked(invalidateTeamCaches).mockResolvedValue();
});

test('ADMIN abre o diálogo, envia convite e atualiza os caches da organização', async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <PaperProvider><TeamScreen /></PaperProvider>
    </QueryClientProvider>,
  );

  await waitFor(() => expect(screen.getByTestId('team-add-member')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('team-add-member'));
  await fireEvent.changeText(screen.getByTestId('add-member-email'), 'ANA@SCALADATACENTERS.COM');
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar convite' }));

  await waitFor(() => expect(teamService.invite).toHaveBeenCalledWith(
    12,
    'ana@scaladatacenters.com',
    'OPERADOR',
  ));
  expect(invalidateTeamCaches).toHaveBeenCalledWith(queryClient, 12);
  expect(await screen.findByText('Convite enviado.')).toBeTruthy();
  await screen.unmount();
  queryClient.clear();
});
