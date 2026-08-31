import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { authService } from '@/services/auth-service';
import { RegisterScreen } from './RegisterScreen';

jest.mock('@/services/auth-service', () => ({
  authService: { register: jest.fn() },
}));

async function renderRegister() {
  const goBack = jest.fn();
  const popTo = jest.fn();
  const props = {
    navigation: { goBack, popTo },
    route: { key: 'Register', name: 'Register', params: undefined },
  } as unknown as React.ComponentProps<typeof RegisterScreen>;

  return {
    ...await render(
      <PaperProvider settings={{ icon: () => null }}>
        <RegisterScreen {...props} />
      </PaperProvider>,
    ),
    goBack,
    popTo,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(authService.register).mockResolvedValue({
    id: 1,
    nome: 'Maria Oliveira',
    email: 'maria@empresa.com',
    ativo: true,
    senhaAlteradaEm: null,
    ultimoLoginEm: null,
  });
});

test('Cadastro retorna ao Login pela ação visível', async () => {
  const screen = await renderRegister();
  await fireEvent.press(screen.getByLabelText('Voltar para o login'));
  expect(screen.goBack).toHaveBeenCalledTimes(1);
});

test('Cadastro envia o contrato real e volta ao Login após sucesso', async () => {
  const screen = await renderRegister();
  await fireEvent.changeText(screen.getByTestId('register-name'), ' Maria Oliveira ');
  await fireEvent.changeText(screen.getByTestId('register-email'), ' MARIA@EMPRESA.COM ');
  await fireEvent.changeText(screen.getByTestId('register-password'), 'senha-com-12-caracteres');
  await fireEvent.press(screen.getByTestId('register-submit'));

  await waitFor(() => expect(authService.register).toHaveBeenCalledWith({
    nome: 'Maria Oliveira',
    email: 'maria@empresa.com',
    senha: 'senha-com-12-caracteres',
  }));
  await waitFor(() => expect(screen.popTo).toHaveBeenCalledWith(
    'Login',
    { notice: 'Conta criada. Entre para continuar.' },
  ));
});

test('Cadastro apresenta erro do backend de forma curta', async () => {
  jest.mocked(authService.register).mockRejectedValue({
    isAxiosError: true,
    response: {
      status: 400,
      data: { mensagem: 'Não foi possível criar a conta com os dados informados' },
    },
  });
  const screen = await renderRegister();
  await fireEvent.changeText(screen.getByTestId('register-name'), 'Maria Oliveira');
  await fireEvent.changeText(screen.getByTestId('register-email'), 'maria@empresa.com');
  await fireEvent.changeText(screen.getByTestId('register-password'), 'senha-com-12-caracteres');
  await fireEvent.press(screen.getByTestId('register-submit'));

  expect(await screen.findByText('Não foi possível criar a conta com os dados informados')).toBeTruthy();
});
