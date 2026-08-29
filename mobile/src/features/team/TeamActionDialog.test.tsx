import { teamActionProfiles, teamActionTitles } from './TeamActionDialog';

test('aprovação usa microcopy curta e não permite ADMIN', () => {
  expect(teamActionTitles.approve).toBe('Aprovar acesso');
  expect(teamActionProfiles('approve')).toEqual(['OPERADOR', 'CONSULTA']);
});

test('alteração de perfil oferece perfis reais', () => {
  expect(teamActionTitles.profile).toBe('Alterar perfil');
  expect(teamActionProfiles('profile')).toEqual(['ADMIN', 'OPERADOR', 'CONSULTA']);
});

test('remoção fala de acesso, não exclusão da conta', () => {
  expect(teamActionTitles.remove).toBe('Remover acesso');
});
