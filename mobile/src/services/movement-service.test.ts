import { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  invalidateMovementCaches,
  movementKeys,
  movementService,
} from './movement-service';

jest.mock('@/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiClient.get).mockResolvedValue({ data: [] });
  jest.mocked(apiClient.post).mockResolvedValue({ data: {} });
});

test('lista histórico real de ferramentas e estoque', async () => {
  await movementService.listTools();
  await movementService.listStock();
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/movimentacoes-ferramenta', { organization: true });
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/movimentacoes-estoque', { organization: true });
});

test('consulta pendências ADMIN no endpoint real', async () => {
  await movementService.listPending();
  expect(apiClient.get).toHaveBeenCalledWith('/api/movimentacoes-ferramenta/pendentes', { organization: true });
});

test('confirma sem payload e sem reexecutar operação', async () => {
  await movementService.confirm(12);
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(apiClient.post).toHaveBeenCalledWith('/api/movimentacoes-ferramenta/12/confirmacao', undefined, { organization: true });
});

test('chaves não misturam organizações', () => {
  expect(movementKeys.tools(1)).not.toEqual(movementKeys.tools(2));
  expect(movementKeys.pending(1)).toEqual(['organization', 1, 'movements', 'pending']);
});

test('confirmação invalida histórico, pendências e dashboard da organização', async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  await invalidateMovementCaches(client, 2);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['organization', 2] });
});
