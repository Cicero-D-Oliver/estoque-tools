import { apiClient } from '@/api/client';
import { authService } from './auth-service';

jest.mock('@/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

beforeEach(() => jest.clearAllMocks());

test('cadastro usa o endpoint público e o contrato esperado pelo backend', async () => {
  const account = {
    id: 1,
    nome: 'Maria Oliveira',
    email: 'maria@empresa.com',
    ativo: true,
    senhaAlteradaEm: null,
    ultimoLoginEm: null,
  };
  jest.mocked(apiClient.post).mockResolvedValue({ data: account });

  const input = {
    nome: 'Maria Oliveira',
    email: 'maria@empresa.com',
    senha: 'senha-com-12-caracteres',
  };
  await expect(authService.register(input)).resolves.toEqual(account);
  expect(apiClient.post).toHaveBeenCalledWith(
    '/api/auth/register',
    input,
    { skipAuthRefresh: true },
  );
});
