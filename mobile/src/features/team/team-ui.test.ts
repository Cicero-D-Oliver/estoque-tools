import type { OrganizationMember } from '@/types/api';
import {
  canAccessTeam,
  combineMembers,
  filterMembers,
  isLastActiveAdmin,
  memberStatusLabels,
  profileLabels,
  teamRequestError,
} from './team-ui';

const member = (overrides: Partial<OrganizationMember> = {}): OrganizationMember => ({
  id: 1, organizacaoId: 10, usuarioId: 11, usuarioNome: 'Álvaro Silva',
  usuarioEmail: 'alvaro@example.com', perfil: 'OPERADOR', status: 'ATIVO',
  solicitadoEm: '2026-08-01T10:00:00Z', aprovadoEm: '2026-08-02T10:00:00Z',
  aprovadoPorUsuarioId: 2, removidoEm: null, ...overrides,
});

test('somente ADMIN acessa Equipe', () => {
  expect(canAccessTeam('ADMIN')).toBe(true);
  expect(canAccessTeam('OPERADOR')).toBe(false);
  expect(canAccessTeam('CONSULTA')).toBe(false);
});

test('combina membros e solicitações sem duplicar', () => {
  const pending = member({ id: 2, usuarioNome: 'Bruno', status: 'PENDENTE' });
  expect(combineMembers([member()], [pending, pending], 10).map((value) => value.id)).toEqual([1, 2]);
});

test('bloqueia qualquer membro de outra organização no cliente', () => {
  const outsider = member({ id: 3, organizacaoId: 20 });
  expect(combineMembers([member(), outsider], [], 10).map((value) => value.id)).toEqual([1]);
});

test.each([
  ['all', [1, 2]],
  ['active', [1]],
  ['pending', [2]],
] as const)('filtra equipe por %s', (filter, expected) => {
  const values = [member(), member({ id: 2, usuarioNome: 'Bruno', status: 'PENDENTE' })];
  expect(filterMembers(values, filter, '').map((value) => value.id)).toEqual(expected);
});

test('busca nome e e-mail ignorando caixa e acentos', () => {
  expect(filterMembers([member()], 'all', 'alvaro').length).toBe(1);
  expect(filterMembers([member()], 'all', 'ALVARO@EXAMPLE').length).toBe(1);
});

test('protege último ADMIN ativo', () => {
  const admin = member({ perfil: 'ADMIN' });
  expect(isLastActiveAdmin(admin, [admin])).toBe(true);
  expect(isLastActiveAdmin(admin, [admin, member({ id: 2, perfil: 'ADMIN' })])).toBe(false);
});

test('não trata ADMIN removido como último ativo', () => {
  const removed = member({ perfil: 'ADMIN', status: 'REMOVIDO' });
  expect(isLastActiveAdmin(removed, [removed])).toBe(false);
});

test('usa perfis e situações em linguagem natural', () => {
  expect(profileLabels).toEqual({ ADMIN: 'Administrador', OPERADOR: 'Operador', CONSULTA: 'Consulta' });
  expect(memberStatusLabels.PENDENTE).toBe('Aguardando aprovação');
  expect(memberStatusLabels.REMOVIDO).toBe('Acesso removido');
});

test('sanitiza regra do último ADMIN e sessão expirada', () => {
  expect(teamRequestError({ isAxiosError: true, response: { status: 400, data: { mensagem: 'Deve existir ao menos um ADMIN' } } })).toBe('Este ambiente precisa manter ao menos um administrador.');
  expect(teamRequestError({ isAxiosError: true, response: { status: 401, data: {} } })).toBe('Sua sessão expirou. Entre novamente.');
});
