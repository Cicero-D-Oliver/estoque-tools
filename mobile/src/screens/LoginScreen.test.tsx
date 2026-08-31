import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { LoginScreen } from './LoginScreen';

const mockLogin = jest.fn();

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

async function renderLogin(params?: { notice?: string }) {
  const navigate = jest.fn();
  const props = {
    navigation: { navigate },
    route: { key: 'Login', name: 'Login', params },
  } as unknown as React.ComponentProps<typeof LoginScreen>;

  return {
    ...await render(
      <PaperProvider settings={{ icon: () => null }}>
        <LoginScreen {...props} />
      </PaperProvider>,
    ),
    navigate,
  };
}

beforeEach(() => jest.clearAllMocks());

test('Login exibe Criar conta e abre o cadastro', async () => {
  const screen = await renderLogin();

  expect(screen.getByText('Criar conta')).toBeTruthy();
  await fireEvent.press(screen.getByText('Criar conta'));

  expect(screen.navigate).toHaveBeenCalledWith('Register');
});

test('Login apresenta a confirmação curta depois do cadastro', async () => {
  const screen = await renderLogin({ notice: 'Conta criada. Entre para continuar.' });
  expect(screen.getByText('Conta criada. Entre para continuar.')).toBeTruthy();
});
