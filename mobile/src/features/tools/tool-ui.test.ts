import type { Account, Tool, ToolMovement } from '@/types/api';
import {
  administrativeToolActions,
  filterTools,
  formatLocalDateTime,
  movementLabels,
  movementSummary,
  normalizeToolSearch,
  operationalToolActions,
  primaryToolAction,
  toolCurrentLocation,
  toolRequestErrorMessage,
  toolStatusLabel,
} from './tool-ui';

const account: Account = {
  id: 7,
  nome: 'Ana Operadora',
  email: 'ana@example.com',
  ativo: true,
  senhaAlteradaEm: null,
  ultimoLoginEm: null,
};

const tool = (overrides: Partial<Tool> = {}): Tool => ({
  id: 1,
  patrimonio: 'PAT-Á-001',
  nome: 'Furadeira de Impacto',
  categoria: 'Elétrica',
  status: 'DISPONIVEL',
  responsavelAtualId: null,
  responsavelAtualNome: null,
  responsavelDesde: null,
  destinoAtual: null,
  localizacao: 'Armário 2',
  ativo: true,
  ...overrides,
});

const tools = [
  tool(),
  tool({ id: 2, patrimonio: 'PAT-002', nome: 'Martelete', status: 'EMPRESTADA', responsavelAtualId: 7 }),
  tool({ id: 3, patrimonio: 'PAT-003', nome: 'Serra', status: 'MANUTENCAO' }),
  tool({ id: 4, patrimonio: 'PAT-004', nome: 'Trena', status: 'PERDIDA' }),
  tool({ id: 5, patrimonio: 'PAT-005', nome: 'Alicate', ativo: false }),
];

test('normaliza busca ignorando caixa e acentos', () => {
  expect(normalizeToolSearch('  FURADÉIRA  ')).toBe('furadeira');
});

test('busca ferramenta por nome sem acentos', () => {
  expect(filterTools(tools, 'active', 'furadeira', 7).map((item) => item.id)).toEqual([1]);
});

test('busca ferramenta por patrimônio sem diferenciar caixa', () => {
  expect(filterTools(tools, 'active', 'pat-á-001'.toUpperCase(), 7).map((item) => item.id)).toEqual([1]);
});

test.each([
  ['active', [1, 2, 3, 4]],
  ['available', [1]],
  ['borrowed', [2]],
  ['maintenance', [3]],
  ['lost', [4]],
  ['inactive', [5]],
  ['mine', [2]],
] as const)('aplica filtro %s', (filter, expected) => {
  expect(filterTools(tools, filter, '', 7).map((item) => item.id)).toEqual(expected);
});

test('não mostra enum EMPRESTADA ao usuário', () => {
  expect(toolStatusLabel(tool({ status: 'EMPRESTADA' }))).toBe('Em uso');
  expect(toolStatusLabel(tool({ ativo: false }))).toBe('Inativa');
});

test('mostra local real para disponível e destino para ferramenta em uso', () => {
  expect(toolCurrentLocation(tool())).toBe('Armário 2');
  expect(toolCurrentLocation(tool({ status: 'EMPRESTADA', destinoAtual: 'Linha 3' }))).toBe('Linha 3');
  expect(toolCurrentLocation(tool({ status: 'EMPRESTADA', destinoAtual: null }))).toBe('Destino não informado');
});

test('não inventa localização para manutenção, perda ou inativa', () => {
  expect(toolCurrentLocation(tool({ status: 'MANUTENCAO' }))).toBe('—');
  expect(toolCurrentLocation(tool({ status: 'PERDIDA' }))).toBe('—');
  expect(toolCurrentLocation(tool({ ativo: false }))).toBe('—');
});

test('converte UTC explícito para o horário local do dispositivo', () => {
  const localDate = new Date(2026, 7, 28, 8, 43);
  const now = new Date(2026, 7, 28, 12, 0);
  expect(formatLocalDateTime(localDate.toISOString(), now)).toContain('Hoje, 08:43');
});

test('define ação principal conforme situação e perfil', () => {
  expect(primaryToolAction(tool(), 'OPERADOR')).toBe('withdraw');
  expect(primaryToolAction(tool({ status: 'EMPRESTADA' }), 'ADMIN')).toBe('return');
  expect(primaryToolAction(tool({ status: 'MANUTENCAO' }), 'OPERADOR')).toBe('complete-maintenance');
  expect(primaryToolAction(tool(), 'CONSULTA')).toBeNull();
});

test('ADMIN possui operações e ações cadastrais reais', () => {
  const borrowed = tool({ status: 'EMPRESTADA', responsavelAtualId: 8 });
  expect(operationalToolActions(borrowed, 'ADMIN', account)).toEqual([
    'return', 'transfer', 'maintenance', 'loss',
  ]);
  expect(administrativeToolActions(tool(), 'ADMIN')).toEqual(['edit', 'inactivate', 'correction']);
});

test('OPERADOR só transfere quando é o responsável atual', () => {
  const mine = tool({ status: 'EMPRESTADA', responsavelAtualId: 7 });
  const another = tool({ status: 'EMPRESTADA', responsavelAtualId: 8 });
  expect(operationalToolActions(mine, 'OPERADOR', account)).toContain('transfer');
  expect(operationalToolActions(another, 'OPERADOR', account)).not.toContain('transfer');
  expect(administrativeToolActions(mine, 'OPERADOR')).toEqual([]);
});

test('CONSULTA não recebe ações de escrita', () => {
  expect(operationalToolActions(tool(), 'CONSULTA', account)).toEqual([]);
  expect(administrativeToolActions(tool(), 'CONSULTA')).toEqual([]);
});

test('histórico usa linguagem operacional sem enums brutos', () => {
  const movement = {
    tipoMovimentacao: 'TRANSFERENCIA',
    responsavelUsuarioNome: 'Bruno',
  } as ToolMovement;
  expect(movementLabels.CONCLUSAO_MANUTENCAO).toBe('Manutenção concluída');
  expect(movementSummary(movement)).toBe('Para Bruno');
});

test('erro de API e sessão expirada permanecem sanitizados', () => {
  expect(toolRequestErrorMessage({ isAxiosError: true })).toBe('Sem conexão com o servidor.');
  expect(toolRequestErrorMessage({ isAxiosError: true, response: { status: 401 } }))
    .toBe('Sua sessão expirou. Entre novamente.');
  expect(toolRequestErrorMessage({ isAxiosError: true, response: { status: 403 } }))
    .toBe('Você não pode realizar esta ação.');
});
