import type { StockItem, StockMovement } from '@/types/api';
import {
  canWriteInventory,
  filterInventory,
  inventoryRequestError,
  inventoryStatus,
  inventoryStatusLabels,
  normalizeInventorySearch,
  primaryInventoryAction,
  stockMovementSentence,
} from './inventory-ui';

const item = (overrides: Partial<StockItem> = {}): StockItem => ({
  id: 1, codigo: 'CAB-Á-01', nome: 'Cabo Elétrico', categoria: null,
  quantidadeAtual: 10, quantidadeMinima: 5, localizacao: 'Prateleira 2',
  ativo: true, abaixoMinimo: false, ...overrides,
});
const items = [
  item(),
  item({ id: 2, codigo: 'LUV-02', nome: 'Luva', quantidadeAtual: 2, quantidadeMinima: 5, abaixoMinimo: true }),
  item({ id: 3, codigo: 'FIT-03', nome: 'Fita', quantidadeAtual: 0, quantidadeMinima: 3, abaixoMinimo: true }),
  item({ id: 4, codigo: 'OLD-04', nome: 'Item antigo', ativo: false }),
];
const low = new Set([2, 3]);

test('normaliza busca de estoque ignorando caixa e acentos', () => {
  expect(normalizeInventorySearch('  CABÔ ELÉTRICO ')).toBe('cabo eletrico');
});

test('busca por nome e código reais', () => {
  expect(filterInventory(items, 'active', 'cabo eletrico', low).map((value) => value.id)).toEqual([1]);
  expect(filterInventory(items, 'active', 'cab-a-01', low).map((value) => value.id)).toEqual([1]);
});

test.each([
  ['active', [1, 2, 3]],
  ['low', [2, 3]],
  ['normal', [1]],
  ['empty', [3]],
  ['inactive', [4]],
] as const)('aplica filtro %s', (filter, expected) => {
  expect(filterInventory(items, filter, '', low).map((value) => value.id)).toEqual(expected);
});

test.each([
  [item(), 'normal'],
  [item({ id: 2, quantidadeAtual: 2 }), 'low'],
  [item({ id: 3, quantidadeAtual: 0 }), 'empty'],
  [item({ ativo: false }), 'inactive'],
] as const)('classifica situação operacional', (value, expected) => {
  expect(inventoryStatus(value as StockItem, low)).toBe(expected);
});

test('usa linguagem natural nas situações', () => {
  expect(inventoryStatusLabels).toEqual(expect.objectContaining({ normal: 'Normal', low: 'Abaixo do mínimo', empty: 'Sem estoque', inactive: 'Inativo' }));
});

test('perfis respeitam escrita real do backend', () => {
  expect(canWriteInventory('ADMIN')).toBe(true);
  expect(canWriteInventory('OPERADOR')).toBe(true);
  expect(canWriteInventory('CONSULTA')).toBe(false);
});

test('ação principal não aparece para CONSULTA nem item inativo', () => {
  expect(primaryInventoryAction(item(), 'CONSULTA')).toBeNull();
  expect(primaryInventoryAction(item({ ativo: false }), 'ADMIN')).toBeNull();
});

test('ação principal favorece entrada quando vazio e saída quando há saldo', () => {
  expect(primaryInventoryAction(item({ quantidadeAtual: 0 }), 'OPERADOR')).toBe('entry');
  expect(primaryInventoryAction(item(), 'OPERADOR')).toBe('exit');
});

test.each([
  ['ENTRADA', 1, 'Entrada de 1 unidade'],
  ['SAIDA', -12, 'Saída de 12 unidades'],
  ['CORRECAO', 8, 'Correção de estoque'],
] as const)('formata histórico %s', (tipoMovimentacao, quantidade, expected) => {
  expect(stockMovementSentence({ tipoMovimentacao, quantidade } as StockMovement)).toBe(expected);
});

test('sanitiza estoque insuficiente e sessão expirada', () => {
  expect(inventoryRequestError({ isAxiosError: true, response: { status: 400, data: { codigo: 'REGRA_NEGOCIO', mensagem: 'Saldo insuficiente' } } }, 'exit')).toBe('Estoque insuficiente.');
  expect(inventoryRequestError({ isAxiosError: true, response: { status: 401, data: {} } })).toBe('Sua sessão expirou. Entre novamente.');
});
