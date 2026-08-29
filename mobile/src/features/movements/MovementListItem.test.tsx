import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import type { UnifiedMovement } from './movement-ui';
import { MovementListItem } from './MovementListItem';

const movement: UnifiedMovement = {
  key: 'tool-1', id: 1, source: 'tool', occurredAt: new Date().toISOString(),
  typeLabel: 'Retirada', sentence: 'João retirou Martelete', subjectName: 'Martelete',
  subjectCode: 'PAT-01', executor: 'João', operationalResult: 'João', responsible: 'João',
  previousResponsible: null, destination: 'Linha 3', observation: null,
  reviewStatus: 'PENDENTE', confirmedBy: null, confirmedAt: null,
};

test('ADMIN visualiza microcopy pendente e confirma', async () => {
  const onConfirm = jest.fn();
  const screen = await render(<PaperProvider><MovementListItem movement={movement} admin onOpen={jest.fn()} onConfirm={onConfirm} /></PaperProvider>);
  expect(screen.getByText('Aguardando confirmação do admin.')).toBeTruthy();
  fireEvent.press(screen.getByText('Confirmar'));
  expect(onConfirm).toHaveBeenCalled();
});

test('OPERADOR e CONSULTA não recebem confirmação administrativa', async () => {
  const screen = await render(<PaperProvider><MovementListItem movement={movement} admin={false} onOpen={jest.fn()} onConfirm={jest.fn()} /></PaperProvider>);
  expect(screen.queryByText('Confirmar')).toBeNull();
  expect(screen.getByText('Detalhes')).toBeTruthy();
});
