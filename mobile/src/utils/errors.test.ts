import { loginErrorMessage, shortErrorMessage } from './errors';

test('erro de login não permite enumeração de contas', () => {
  expect(loginErrorMessage({ isAxiosError: true, response: { status: 401 } })).toBe('E-mail ou senha incorretos.');
});

test('erro de rede permanece curto', () => {
  expect(shortErrorMessage({ isAxiosError: true })).toBe('Sem conexão com o servidor.');
});
