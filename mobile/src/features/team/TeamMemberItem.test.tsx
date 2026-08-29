import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import type { OrganizationMember } from '@/types/api';
import { TeamMemberItem } from './TeamMemberItem';

const member = (overrides: Partial<OrganizationMember> = {}): OrganizationMember => ({
  id: 1, organizacaoId: 10, usuarioId: 11, usuarioNome: 'Ana', usuarioEmail: 'ana@example.com',
  perfil: 'OPERADOR', status: 'ATIVO', solicitadoEm: '', aprovadoEm: '',
  aprovadoPorUsuarioId: 2, removidoEm: null, ...overrides,
});

test('solicitação pendente oferece aprovação', async () => {
  const screen = await render(<PaperProvider><TeamMemberItem member={member({ status: 'PENDENTE' })} protectedAdmin={false} onAction={jest.fn()} /></PaperProvider>);
  expect(screen.getByText('Aprovar')).toBeTruthy();
});

test('membro ativo oferece perfil e remoção', async () => {
  const screen = await render(<PaperProvider><TeamMemberItem member={member()} protectedAdmin={false} onAction={jest.fn()} /></PaperProvider>);
  expect(screen.getByText('Alterar perfil')).toBeTruthy();
  expect(screen.getByText('Remover')).toBeTruthy();
});

test('último ADMIN não recebe ações destrutivas', async () => {
  const screen = await render(<PaperProvider><TeamMemberItem member={member({ perfil: 'ADMIN' })} protectedAdmin onAction={jest.fn()} /></PaperProvider>);
  expect(screen.getByText('Último administrador')).toBeTruthy();
  expect(screen.queryByText('Alterar perfil')).toBeNull();
  expect(screen.queryByText('Remover')).toBeNull();
});
