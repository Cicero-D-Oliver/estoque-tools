import type { Tool } from '@/types/api';
import { buildToolActionPayload, validateToolAction } from './ToolActionDialog';

const tool = {
  id: 1,
  responsavelAtualId: 7,
  status: 'EMPRESTADA',
  ativo: true,
} as Tool;

const values = {
  patrimonio: '',
  nome: '',
  categoria: '',
  localizacao: '',
  destino: '',
  observacao: '',
  novoResponsavelUsuarioId: '',
  novoStatus: '' as const,
};

test('valida campos obrigatórios de cadastro', () => {
  expect(validateToolAction('create', values, null)).toMatchObject({
    patrimonio: 'Informe o patrimônio.',
    nome: 'Informe o nome.',
  });
});

test('retirada mantém destino e observação opcionais', () => {
  expect(validateToolAction('withdraw', values, tool)).toEqual({});
  expect(buildToolActionPayload('withdraw', { ...values, destino: ' Linha 3 ' }))
    .toEqual({ movement: { destino: 'Linha 3', observacao: undefined, novoResponsavelUsuarioId: undefined, novoStatus: undefined } });
});

test('transferência exige novo responsável diferente do atual', () => {
  expect(validateToolAction('transfer', values, tool).novoResponsavelUsuarioId).toBeDefined();
  expect(validateToolAction(
    'transfer',
    { ...values, novoResponsavelUsuarioId: '7' },
    tool,
  ).novoResponsavelUsuarioId).toBe('Escolha uma pessoa diferente.');
});

test.each(['maintenance', 'loss', 'correction'] as const)(
  '%s exige motivo no aplicativo',
  (action) => expect(validateToolAction(action, values, tool).observacao).toBeDefined(),
);

test('correção exige novo estado e gera payload sem EMPRESTADA', () => {
  expect(validateToolAction('correction', values, tool).novoStatus).toBeDefined();
  expect(buildToolActionPayload('correction', {
    ...values,
    observacao: ' Ajuste confirmado ',
    novoStatus: 'DISPONIVEL',
  })).toEqual({
    movement: {
      destino: undefined,
      observacao: 'Ajuste confirmado',
      novoResponsavelUsuarioId: undefined,
      novoStatus: 'DISPONIVEL',
    },
  });
});
