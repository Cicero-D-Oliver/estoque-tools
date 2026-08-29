import fs from 'node:fs';
import path from 'node:path';

import config from '../../app.config';

const blockedAndroidPermissions = [
  'android.permission.CAMERA',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.READ_SMS',
  'android.permission.SEND_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.MANAGE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_PHONE_STATE',
  'android.permission.READ_PHONE_NUMBERS',
  'android.permission.CALL_PHONE',
  'android.permission.ANSWER_PHONE_CALLS',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.BIND_ACCESSIBILITY_SERVICE',
  'android.permission.VIBRATE',
];

test('Android solicita somente internet e bloqueia permissões sensíveis', () => {
  expect(config.android?.permissions).toEqual(['INTERNET']);
  expect(config.android?.blockedPermissions).toEqual(expect.arrayContaining(blockedAndroidPermissions));
});

test('identidade e versão Android permanecem estáveis para a primeira distribuição', () => {
  expect(config.name).toBe('Estoque Tools');
  expect(config.slug).toBe('estoque-tools');
  expect(config.version).toBe('1.0.0');
  expect(config.orientation).toBe('portrait');
  expect(config.android?.package).toBe('com.equipe.estoquetools');
  expect(config.android?.versionCode).toBe(1);
  expect(config.android?.allowBackup).toBe(false);
});

test('tráfego HTTP é permitido somente fora do ambiente de produção', () => {
  const buildPropertiesPlugin = config.plugins?.find(
    plugin => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
  );
  const expectedCleartextTraffic = process.env.EXPO_PUBLIC_APP_ENV !== 'production';

  expect(buildPropertiesPlugin).toEqual([
    'expo-build-properties',
    { android: { usesCleartextTraffic: expectedCleartextTraffic } },
  ]);
});

test('perfil EAS gera APK interno e mantém a versão sob controle do projeto', () => {
  const easConfig = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../eas.json'), 'utf8'),
  ) as {
    cli?: { appVersionSource?: string };
    build?: { internal?: { distribution?: string; environment?: string; android?: { buildType?: string } } };
  };

  expect(easConfig.cli?.appVersionSource).toBe('local');
  expect(easConfig.build?.internal).toMatchObject({
    distribution: 'internal',
    environment: 'preview',
    android: { buildType: 'apk' },
  });
});
