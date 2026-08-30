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
  expect(config.owner).toBe('cicerodoliver');
  expect(config.extra?.eas?.projectId).toBe('73062e90-db02-413a-9b68-cd105d86d16c');
  expect(config.version).toBe('1.0.0');
  expect(config.orientation).toBe('portrait');
  expect(config.android?.package).toBe('com.equipe.estoquetools');
  expect(config.android?.versionCode).toBe(1);
  expect(config.android?.allowBackup).toBe(false);
  expect(config.icon).toBe('./assets/icon.png');
  expect(config.android?.icon).toBe('./assets/icon.png');
  expect(config.android?.adaptiveIcon).toEqual({
    foregroundImage: './assets/adaptive-icon.png',
    monochromeImage: './assets/monochrome-icon.png',
    backgroundColor: '#1559A6',
  });
});

test('splash nativo usa somente o símbolo oficial sobre o azul da marca', () => {
  const splashPlugin = config.plugins?.find(
    plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
  );

  expect(splashPlugin).toEqual([
    'expo-splash-screen',
    {
      backgroundColor: '#0B2F57',
      image: './assets/splash-icon.png',
      imageWidth: 220,
      resizeMode: 'contain',
    },
  ]);
});

test('assets de distribuição existem como PNG quadrado em alta resolução', () => {
  const assetPaths = [
    'icon.png',
    'adaptive-icon.png',
    'monochrome-icon.png',
    'splash-icon.png',
  ];

  for (const assetPath of assetPaths) {
    const image = fs.readFileSync(path.resolve(__dirname, '../../assets', assetPath));
    expect(image.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(image.readUInt32BE(16)).toBe(1024);
    expect(image.readUInt32BE(20)).toBe(1024);
  }
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
    build?: Record<string, {
      distribution?: string;
      environment?: string;
      env?: Record<string, string>;
      android?: { buildType?: string };
    }>;
  };

  expect(easConfig.cli?.appVersionSource).toBe('local');
  expect(easConfig.build?.internal).toMatchObject({
    distribution: 'internal',
    environment: 'preview',
    env: { EXPO_PUBLIC_APP_ENV: 'production' },
    android: { buildType: 'apk' },
  });
  expect(easConfig.build?.['preview-lan']).toMatchObject({
    distribution: 'internal',
    environment: 'development',
    env: { EXPO_PUBLIC_APP_ENV: 'development' },
    android: { buildType: 'apk' },
  });
});
