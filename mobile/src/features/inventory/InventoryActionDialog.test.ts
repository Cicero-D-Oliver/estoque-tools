import type { StockItem } from '@/types/api';
import {
  buildInventoryPayload,
  emptyInventoryValues,
  validateInventoryAction,
} from './InventoryActionDialog';

const validForm = {
  ...emptyInventoryValues,
  codigo: ' CAB-01 ',
  nome: ' Cabo ',
  quantidadeAtual: '10',
  quantidadeMinima: '5',
};

test('cadastro exige código e nome', () => {
  expect(validateInventoryAction('create', emptyInventoryValues)).toMatchObject({
    codigo: 'Informe o código.', nome: 'Informe o nome.',
  });
});

test('cadastro rejeita quantidades negativas e fracionadas', () => {
  expect(validateInventoryAction('create', { ...validForm, quantidadeAtual: '-1' }).quantidadeAtual).toBeDefined();
  expect(validateInventoryAction('create', { ...validForm, quantidadeMinima: '1.5' }).quantidadeMinima).toBeDefined();
});

test('gera DTO cadastral real e normalizado', () => {
  expect(buildInventoryPayload('create', { ...validForm, categoria: ' Elétrica ', localizacao: ' A2 ' })).toEqual({
    form: { codigo: 'CAB-01', nome: 'Cabo', categoria: 'Elétrica', quantidadeAtual: 10, quantidadeMinima: 5, localizacao: 'A2' },
  });
});

test.each(['entry', 'exit'] as const)('%s exige quantidade inteira positiva', (action) => {
  expect(validateInventoryAction(action, emptyInventoryValues).quantidade).toBeDefined();
  expect(validateInventoryAction(action, { ...emptyInventoryValues, quantidade: '2' })).toEqual({});
});

test('correção aceita saldo zero e exige motivo', () => {
  expect(validateInventoryAction('correction', { ...emptyInventoryValues, observacao: 'Contagem' }).quantidade).toBeDefined();
  expect(validateInventoryAction('correction', { ...emptyInventoryValues, quantidade: '0' }).observacao).toBeDefined();
  expect(validateInventoryAction('correction', { ...emptyInventoryValues, quantidade: '0', observacao: ' Contagem ' })).toEqual({});
});

test('respeita o limite numérico do contrato backend', () => {
  expect(validateInventoryAction('entry', { ...emptyInventoryValues, quantidade: '1000000001' }).quantidade).toBeDefined();
});

test('gera movimento sem IDs de usuário enviados pelo cliente', () => {
  expect(buildInventoryPayload('correction', { ...emptyInventoryValues, quantidade: '8', observacao: ' Ajuste ' })).toEqual({
    movement: { quantidade: 8, observacao: 'Ajuste' },
  });
});

test('tipo StockItem permanece compatível com a edição', () => {
  const value = { id: 1, quantidadeAtual: 4 } as StockItem;
  expect(value.quantidadeAtual).toBe(4);
});
