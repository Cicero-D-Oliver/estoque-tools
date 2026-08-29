import { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StockItem } from '@/types/api';
import {
  executeInventoryAction,
  invalidateInventoryCaches,
  inventoryKeys,
  inventoryService,
} from './inventory-service';

jest.mock('@/api/client', () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

const item = { id: 4, codigo: 'CAB-04', nome: 'Cabo', quantidadeAtual: 10 } as StockItem;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiClient.get).mockResolvedValue({ data: [] });
  jest.mocked(apiClient.post).mockResolvedValue({ data: {} });
  jest.mocked(apiClient.put).mockResolvedValue({ data: {} });
  jest.mocked(apiClient.delete).mockResolvedValue({ data: undefined });
});

test('lista, baixo estoque, detalhe e histórico usam API real com organização', async () => {
  await inventoryService.list();
  await inventoryService.lowStock();
  await inventoryService.get(4);
  await inventoryService.history(4);
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/itens', { organization: true });
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/itens/abaixo-minimo', { organization: true });
  expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/itens/4', { organization: true });
  expect(apiClient.get).toHaveBeenNthCalledWith(4, '/api/itens/4/historico', { organization: true });
});

test('cadastro, edição e inativação usam endpoints ADMIN', async () => {
  const form = { codigo: 'CAB-04', nome: 'Cabo', quantidadeAtual: 10, quantidadeMinima: 2 };
  await executeInventoryAction('create', null, { form });
  await executeInventoryAction('edit', item, { form });
  await executeInventoryAction('inactivate', item, {});
  expect(apiClient.post).toHaveBeenCalledWith('/api/itens', form, { organization: true });
  expect(apiClient.put).toHaveBeenCalledWith('/api/itens/4', form, { organization: true });
  expect(apiClient.delete).toHaveBeenCalledWith('/api/itens/4', { organization: true });
});

test.each([
  ['entry', 'entrada'], ['exit', 'saida'], ['correction', 'correcao'],
] as const)('executa %s no endpoint %s', async (action, endpoint) => {
  const movement = { quantidade: 3, observacao: 'Campo' };
  await executeInventoryAction(action, item, { movement });
  expect(apiClient.post).toHaveBeenCalledWith(`/api/itens/4/${endpoint}`, movement, { organization: true });
});

test('chaves e invalidação são isoladas por organização', async () => {
  expect(inventoryKeys.list(10)).not.toEqual(inventoryKeys.list(20));
  expect(inventoryKeys.history(10, 4)).toEqual(['organization', 10, 'inventory', 'history', 4]);
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
  await invalidateInventoryCaches(client, 10);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['organization', 10] });
});
