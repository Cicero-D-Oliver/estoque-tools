import { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Tool } from '@/types/api';
import {
  executeToolAction,
  invalidateToolCaches,
  toolKeys,
  toolService,
} from './tool-service';

jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const tool: Tool = {
  id: 9,
  patrimonio: 'PAT-009',
  nome: 'Martelete',
  categoria: null,
  status: 'DISPONIVEL',
  responsavelAtualId: null,
  responsavelAtualNome: null,
  responsavelDesde: null,
  destinoAtual: null,
  localizacao: 'Armário',
  ativo: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiClient.get).mockResolvedValue({ data: [] });
  jest.mocked(apiClient.post).mockResolvedValue({ data: {} });
  jest.mocked(apiClient.put).mockResolvedValue({ data: {} });
  jest.mocked(apiClient.delete).mockResolvedValue({ data: undefined });
});

test('lista, detalhe e histórico usam endpoints reais com organização', async () => {
  await toolService.list();
  await toolService.get(9);
  await toolService.history(9);
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/ferramentas', { organization: true });
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/ferramentas/9', { organization: true });
  expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/ferramentas/9/historico', { organization: true });
});

test('consome endpoint seguro de responsáveis somente sob demanda', async () => {
  await toolService.transferResponsibles();
  expect(apiClient.get).toHaveBeenCalledWith(
    '/api/ferramentas/responsaveis-transferencia',
    { organization: true },
  );
});

test('executa cadastro, edição e inativação ADMIN', async () => {
  const form = { patrimonio: 'PAT-009', nome: 'Martelete' };
  await executeToolAction({ action: 'create', tool: null, form });
  await executeToolAction({ action: 'edit', tool, form });
  await executeToolAction({ action: 'inactivate', tool });
  expect(apiClient.post).toHaveBeenCalledWith('/api/ferramentas', form, { organization: true });
  expect(apiClient.put).toHaveBeenCalledWith('/api/ferramentas/9', form, { organization: true });
  expect(apiClient.delete).toHaveBeenCalledWith('/api/ferramentas/9', { organization: true });
});

test.each([
  ['withdraw', 'retirada'],
  ['return', 'devolucao'],
  ['transfer', 'transferencia'],
  ['maintenance', 'manutencao'],
  ['complete-maintenance', 'conclusao-manutencao'],
  ['loss', 'perda'],
  ['correction', 'correcao'],
] as const)('executa operação %s no endpoint %s', async (action, endpoint) => {
  const movement = { observacao: 'Registro de campo' };
  await executeToolAction({ action, tool, movement });
  expect(apiClient.post).toHaveBeenCalledWith(
    `/api/ferramentas/9/${endpoint}`,
    movement,
    { organization: true },
  );
});

test('chaves de ferramentas são isoladas pela organização', () => {
  expect(toolKeys.list(10)).toEqual(['organization', 10, 'tools', 'list']);
  expect(toolKeys.list(20)).not.toEqual(toolKeys.list(10));
  expect(toolKeys.history(10, 9)).toEqual(['organization', 10, 'tools', 'history', 9]);
});

test('operação invalida lista, detalhe, histórico, dashboard e pendências da organização', async () => {
  const queryClient = new QueryClient();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  await invalidateToolCaches(queryClient, 10);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['organization', 10] });
});
