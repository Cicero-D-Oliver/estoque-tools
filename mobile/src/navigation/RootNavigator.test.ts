import { resolveRootRoute } from './RootNavigator';

test('mantém Splash durante restauração de sessão', () => {
  expect(resolveRootRoute('restoring', false, false)).toBe('Splash');
});

test('protege a navegação e envia anônimo ao Login', () => {
  expect(resolveRootRoute('anonymous', false, false)).toBe('Login');
});

test('exige seleção de organização antes da navegação principal', () => {
  expect(resolveRootRoute('authenticated', false, false)).toBe('Organizations');
});

test('libera o app somente com sessão e organização ativa', () => {
  expect(resolveRootRoute('authenticated', false, true)).toBe('Main');
});
