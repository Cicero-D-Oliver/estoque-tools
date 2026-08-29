import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import type { Tool } from '@/types/api';
import { ToolListItem } from './ToolListItem';

const borrowed: Tool = {
  id: 4,
  patrimonio: 'PAT-004',
  nome: 'Martelete',
  categoria: null,
  status: 'EMPRESTADA',
  responsavelAtualId: 7,
  responsavelAtualNome: 'Ana Operadora',
  responsavelDesde: new Date(2026, 7, 28, 8, 43).toISOString(),
  destinoAtual: 'Linha 3',
  localizacao: 'Armário 2',
  ativo: true,
};

test('linha compacta mostra nome, patrimônio, situação, responsável, local, desde e ação', async () => {
  const onOpen = jest.fn();
  const onAction = jest.fn();
  const screen = await render(
    <PaperProvider>
      <ToolListItem tool={borrowed} profile="OPERADOR" onOpen={onOpen} onAction={onAction} />
    </PaperProvider>,
  );
  expect(screen.getByText('Martelete')).toBeTruthy();
  expect(screen.getByText('PAT-004')).toBeTruthy();
  expect(screen.getByText('Em uso')).toBeTruthy();
  expect(screen.getByText('Ana Operadora')).toBeTruthy();
  expect(screen.getByText('Linha 3')).toBeTruthy();
  expect(screen.getByText(/Hoje|Ontem|\d{2}\/\d{2}\/\d{4}/)).toBeTruthy();
  fireEvent.press(screen.getByText('Devolver'));
  expect(onAction).toHaveBeenCalledWith('return');
});

test('CONSULTA abre detalhe mas não recebe CTA de escrita', async () => {
  const onOpen = jest.fn();
  const screen = await render(
    <PaperProvider>
      <ToolListItem tool={borrowed} profile="CONSULTA" onOpen={onOpen} onAction={jest.fn()} />
    </PaperProvider>,
  );
  expect(screen.queryByText('Devolver')).toBeNull();
  fireEvent.press(screen.getByText('Detalhes'));
  expect(onOpen).toHaveBeenCalled();
});
