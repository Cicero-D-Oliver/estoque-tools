import { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { invalidateTeamCaches, teamKeys, teamService } from './team-service';

jest.mock('@/api/client', () => ({ apiClient: { get: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiClient.get).mockResolvedValue({ data: [] });
  jest.mocked(apiClient.put).mockResolvedValue({ data: {} });
  jest.mocked(apiClient.delete).mockResolvedValue({ data: undefined });
});

test('lista membros e solicitações da organização real', async () => {
  await teamService.listMembers(10);
  await teamService.listPending(10);
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/organizacoes/10/membros', { organization: true });
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/organizacoes/10/solicitacoes', { organization: true });
});

test('aprovação aceita somente perfil operacional enviado', async () => {
  await teamService.approve(10, 2, 'OPERADOR');
  expect(apiClient.put).toHaveBeenCalledWith('/api/organizacoes/10/solicitacoes/2/aprovacao', { perfil: 'OPERADOR' }, { organization: true });
});

test('alteração de perfil usa endpoint protegido', async () => {
  await teamService.updateProfile(10, 2, 'CONSULTA');
  expect(apiClient.put).toHaveBeenCalledWith('/api/organizacoes/10/membros/2/perfil', { perfil: 'CONSULTA' }, { organization: true });
});

test('remoção é lógica no vínculo e não exclui conta global', async () => {
  await teamService.remove(10, 2);
  expect(apiClient.delete).toHaveBeenCalledWith('/api/organizacoes/10/membros/2', { organization: true });
});

test('chaves e invalidações preservam isolamento', async () => {
  expect(teamKeys.members(10)).not.toEqual(teamKeys.members(20));
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  await invalidateTeamCaches(client, 10);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['organization', 10] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['organizations'] });
});
