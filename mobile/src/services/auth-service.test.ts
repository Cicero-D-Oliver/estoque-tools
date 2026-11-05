import { apiClient } from '@/api/client';
import { authService } from './auth-service';

jest.mock('@/api/client', () => ({ apiClient: { post: jest.fn(), get: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiClient.post).mockResolvedValue({ data: {} });
  jest.mocked(apiClient.get).mockResolvedValue({ data: {} });
});

test('login mobile usa somente o contrato autenticado próprio', async () => {
  await authService.login('ana@scaladatacenters.com', 'senha-com-12-caracteres');
  expect(apiClient.post).toHaveBeenCalledWith(
    '/api/mobile/auth/login',
    {
      email: 'ana@scaladatacenters.com',
      senha: 'senha-com-12-caracteres',
    },
    { skipAuthRefresh: true },
  );
  expect(apiClient.post).toHaveBeenCalledTimes(1);
});

test('renova sessão usando somente o refresh token', async () => {
  await authService.refresh('refresh-seguro');
  expect(apiClient.post).toHaveBeenCalledWith(
    '/api/mobile/auth/refresh',
    { refreshToken: 'refresh-seguro' },
    { skipAuthRefresh: true },
  );
});

test('consulta a conta autenticada sem enviar credenciais no payload', async () => {
  await authService.me();
  expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
});

test('logout revoga somente o refresh token informado', async () => {
  await authService.logout('refresh-seguro');
  expect(apiClient.post).toHaveBeenCalledWith('/api/mobile/auth/logout', {
    refreshToken: 'refresh-seguro',
  });
});
