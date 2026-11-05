import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';

test('mostra entrada, perfis operacionais e envia e-mail normalizado', async () => {
  const submit = jest.fn();
  const screen = await render(
    <PaperProvider>
      <AddTeamMemberDialog visible pending={false} error={null} onClose={jest.fn()} onSubmit={submit} />
    </PaperProvider>,
  );
  await waitFor(() => expect(screen.getByText('Convidar pessoa')).toBeTruthy());
  expect(screen.getByText('Operador')).toBeTruthy();
  expect(screen.getByText('Consulta')).toBeTruthy();
  expect(screen.queryByText('Administrador')).toBeNull();
  await fireEvent.changeText(screen.getByTestId('add-member-email'), 'ANA@SCALADATACENTERS.COM');
  await fireEvent.press(screen.getByTestId('add-member-profile-consulta'));
  await fireEvent.press(screen.getByText('Enviar convite'));
  expect(submit).toHaveBeenCalledWith('ana@scaladatacenters.com', 'CONSULTA');
});

test('bloqueia domínio parecido sem chamar o backend', async () => {
  const submit = jest.fn();
  const screen = await render(
    <PaperProvider>
      <AddTeamMemberDialog visible pending={false} error={null} onClose={jest.fn()} onSubmit={submit} />
    </PaperProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('add-member-email')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('add-member-email'), 'ana@scaladatacenters.com.br');
  await fireEvent.press(screen.getByText('Enviar convite'));
  expect(screen.getByText('Use o e-mail corporativo @scaladatacenters.com.')).toBeTruthy();
  expect(submit).not.toHaveBeenCalled();
});

test('exibe erro funcional sem orientar cadastro público', async () => {
  const screen = await render(
    <PaperProvider>
      <AddTeamMemberDialog visible pending={false} error="Usuário ainda não cadastrado." onClose={jest.fn()} onSubmit={jest.fn()} />
    </PaperProvider>,
  );
  await waitFor(() => expect(screen.getByText('Usuário ainda não cadastrado.')).toBeTruthy());
  expect(screen.queryByText('Peça para a pessoa criar a conta e tente novamente.')).toBeNull();
});

test('bloqueia as ações enquanto a inclusão está em andamento', async () => {
  const screen = await render(
    <PaperProvider>
      <AddTeamMemberDialog visible pending error={null} onClose={jest.fn()} onSubmit={jest.fn()} />
    </PaperProvider>,
  );
  expect(screen.getByRole('button', { name: 'Enviar convite' }).props.accessibilityState).toMatchObject({ disabled: true });
  expect(screen.getByRole('button', { name: 'Cancelar' }).props.accessibilityState).toMatchObject({ disabled: true });
});
