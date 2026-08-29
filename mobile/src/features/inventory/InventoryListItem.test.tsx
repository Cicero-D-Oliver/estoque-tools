import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import type { StockItem } from '@/types/api';
import { InventoryListItem } from './InventoryListItem';

const item: StockItem = { id: 1, codigo: 'CAB-01', nome: 'Cabo', categoria: null, quantidadeAtual: 2, quantidadeMinima: 5, localizacao: 'A2', ativo: true, abaixoMinimo: true };

test('linha compacta mostra dados operacionais e ação', async () => {
  const onAction = jest.fn();
  const screen = await render(<PaperProvider><InventoryListItem item={item} profile="OPERADOR" officialLowStockIds={new Set([1])} onOpen={jest.fn()} onAction={onAction} /></PaperProvider>);
  expect(screen.getByText('Cabo')).toBeTruthy();
  expect(screen.getByText('CAB-01')).toBeTruthy();
  expect(screen.getByText('Abaixo do mínimo')).toBeTruthy();
  expect(screen.getByText('A2')).toBeTruthy();
  fireEvent.press(screen.getByText('Saída'));
  expect(onAction).toHaveBeenCalledWith('exit');
});

test('CONSULTA lê os dados sem ação de escrita', async () => {
  const screen = await render(<PaperProvider><InventoryListItem item={item} profile="CONSULTA" officialLowStockIds={new Set([1])} onOpen={jest.fn()} onAction={jest.fn()} /></PaperProvider>);
  expect(screen.queryByText('Saída')).toBeNull();
  expect(screen.getByText('Detalhes')).toBeTruthy();
});
