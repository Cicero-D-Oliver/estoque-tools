import type { StockMovement, ToolMovement } from '@/types/api';
import {
  combineMovements,
  confirmationError,
  filterMovements,
} from './movement-ui';

const toolMovement = (overrides: Partial<ToolMovement> = {}): ToolMovement => ({
  id: 1, ferramentaId: 2, ferramentaNome: 'Martelete', ferramentaPatrimonio: 'PAT-02',
  usuarioId: 3, usuarioNome: 'João', responsavelUsuarioId: 3, responsavelUsuarioNome: 'João',
  responsavelAnteriorUsuarioId: null, responsavelAnteriorUsuarioNome: null,
  tipoMovimentacao: 'RETIRADA', dataHora: '2026-08-29T10:00:00Z', observacao: null,
  destino: 'Linha 3', statusRevisao: 'PENDENTE', confirmadoPorUsuarioId: null,
  confirmadoPorUsuarioNome: null, confirmadoEm: null, ...overrides,
});
const stockMovement = (overrides: Partial<StockMovement> = {}): StockMovement => ({
  id: 5, itemEstoqueId: 6, itemEstoqueNome: 'Cabo CAT6', usuarioId: 7,
  usuarioNome: 'Maria', tipoMovimentacao: 'ENTRADA', quantidade: 20,
  dataHora: '2026-08-29T11:00:00Z', observacao: null, ...overrides,
});

test.each([
  ['RETIRADA', 'João retirou Martelete'],
  ['DEVOLUCAO', 'João devolveu Martelete'],
  ['MANUTENCAO', 'João enviou Martelete para manutenção'],
  ['CONCLUSAO_MANUTENCAO', 'João concluiu a manutenção de Martelete'],
  ['PERDA', 'João registrou a perda de Martelete'],
  ['CORRECAO', 'João corrigiu o estado de Martelete'],
] as const)('humaniza movimentação de ferramenta %s', (tipoMovimentacao, expected) => {
  expect(combineMovements([toolMovement({ tipoMovimentacao })], [])[0].sentence).toBe(expected);
});

test('humaniza transferência com novo responsável', () => {
  expect(combineMovements([toolMovement({ tipoMovimentacao: 'TRANSFERENCIA', responsavelUsuarioNome: 'Ana' })], [])[0].sentence).toBe('Martelete foi transferida para Ana');
});

test.each([
  ['ENTRADA', 20, 'Entrada de 20 unidades de Cabo CAT6'],
  ['SAIDA', -1, 'Saída de 1 unidade de Cabo CAT6'],
  ['CORRECAO', 8, 'Estoque de Cabo CAT6 corrigido para 8 unidades'],
] as const)('humaniza movimento de estoque %s', (tipoMovimentacao, quantidade, expected) => {
  expect(combineMovements([], [stockMovement({ tipoMovimentacao, quantidade })])[0].sentence).toBe(expected);
});

test('combina e ordena histórico unificado por data', () => {
  const result = combineMovements([toolMovement()], [stockMovement()]);
  expect(result.map((item) => item.key)).toEqual(['stock-5', 'tool-1']);
});

test.each([
  ['all', ['stock-5', 'tool-1']],
  ['tools', ['tool-1']],
  ['stock', ['stock-5']],
  ['pending', ['tool-1']],
  ['confirmed', []],
] as const)('filtra %s', (filter, expected) => {
  const result = combineMovements([toolMovement()], [stockMovement()]);
  expect(filterMovements(result, filter, '').map((item) => item.key)).toEqual(expected);
});

test('busca por ferramenta, patrimônio, pessoa e destino ignorando acentos', () => {
  const result = combineMovements([toolMovement()], [stockMovement()]);
  expect(filterMovements(result, 'all', 'martelete linha').map((item) => item.key)).toEqual(['tool-1']);
  expect(filterMovements(result, 'all', 'cabo maria').map((item) => item.key)).toEqual(['stock-5']);
  expect(filterMovements(result, 'all', 'pat-02').map((item) => item.key)).toEqual(['tool-1']);
});

test('mantém confirmação administrativa separada do resultado operacional', () => {
  const result = combineMovements([toolMovement()], [])[0];
  expect(result.reviewStatus).toBe('PENDENTE');
  expect(result.operationalResult).toBe('João');
});

test('sanitiza erros de confirmação e sessão', () => {
  expect(confirmationError({ isAxiosError: true, response: { status: 403 } })).toBe('Você não pode confirmar esta movimentação.');
  expect(confirmationError({ isAxiosError: true, response: { status: 401 } })).toBe('Sua sessão expirou. Entre novamente.');
});
