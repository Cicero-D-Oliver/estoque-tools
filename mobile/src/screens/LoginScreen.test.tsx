import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { LoginScreen } from './LoginScreen';
import { useAuth } from '@/providers/AuthProvider';

jest.mock('@/providers/AuthProvider', () => ({ useAuth: jest.fn() }));

test('mantém somente o acesso corporativo sem cadastro público', async () => {
  jest.mocked(useAuth).mockReturnValue({ login: jest.fn() } as never);
  const screen = await render(
    <PaperProvider>
      <LoginScreen
        navigation={{ navigate: jest.fn() } as never}
        route={{ key: 'login', name: 'Login', params: undefined } as never}
      />
    </PaperProvider>,
  );

  expect(screen.getAllByText('Entrar').length).toBeGreaterThan(0);
  expect(screen.queryByText('Criar conta')).toBeNull();
});

test('mostra avisos curtos recebidos pela rota', async () => {
  jest.mocked(useAuth).mockReturnValue({ login: jest.fn() } as never);
  const screen = await render(
    <PaperProvider>
      <LoginScreen
        navigation={{ navigate: jest.fn() } as never}
        route={{ key: 'login', name: 'Login', params: { notice: 'Conta criada. Entre para continuar.' } } as never}
      />
    </PaperProvider>,
  );
  expect(screen.getByText('Conta criada. Entre para continuar.')).toBeTruthy();
});

test('exige e-mail e senha antes de autenticar', async () => {
  const login = jest.fn();
  jest.mocked(useAuth).mockReturnValue({ login } as never);
  const screen = await render(
    <PaperProvider><LoginScreen navigation={{} as never} route={{ key: 'login', name: 'Login' } as never} /></PaperProvider>,
  );
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(screen.getByText('Informe e-mail e senha.')).toBeTruthy();
  expect(login).not.toHaveBeenCalled();
});

test('não envia formulário quando somente o e-mail foi preenchido', async () => {
  const login = jest.fn();
  jest.mocked(useAuth).mockReturnValue({ login } as never);
  const screen = await render(
    <PaperProvider><LoginScreen navigation={{} as never} route={{ key: 'login', name: 'Login' } as never} /></PaperProvider>,
  );
  await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@scaladatacenters.com');
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(login).not.toHaveBeenCalled();
});

test('não envia formulário quando somente a senha foi preenchida', async () => {
  const login = jest.fn();
  jest.mocked(useAuth).mockReturnValue({ login } as never);
  const screen = await render(
    <PaperProvider><LoginScreen navigation={{} as never} route={{ key: 'login', name: 'Login' } as never} /></PaperProvider>,
  );
  await fireEvent.changeText(screen.getByTestId('login-password'), 'SenhaSegura!2026');
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(login).not.toHaveBeenCalled();
});

test('envia as credenciais informadas ao provedor de autenticação', async () => {
  const login = jest.fn().mockResolvedValue(undefined);
  jest.mocked(useAuth).mockReturnValue({ login } as never);
  const screen = await render(
    <PaperProvider><LoginScreen navigation={{} as never} route={{ key: 'login', name: 'Login' } as never} /></PaperProvider>,
  );
  await fireEvent.changeText(screen.getByTestId('login-email'), ' ana@scaladatacenters.com ');
  await fireEvent.changeText(screen.getByTestId('login-password'), 'SenhaSegura!2026');
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(login).toHaveBeenCalledWith(' ana@scaladatacenters.com ', 'SenhaSegura!2026');
});

test('mostra erro curto quando a autenticação falha', async () => {
  const login = jest.fn().mockRejectedValue(new Error('falha interna'));
  jest.mocked(useAuth).mockReturnValue({ login } as never);
  const screen = await render(
    <PaperProvider><LoginScreen navigation={{} as never} route={{ key: 'login', name: 'Login' } as never} /></PaperProvider>,
  );
  await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@scaladatacenters.com');
  await fireEvent.changeText(screen.getByTestId('login-password'), 'SenhaIncorreta!2026');
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(await screen.findByText('Não foi possível entrar. Tente novamente.')).toBeTruthy();
});
