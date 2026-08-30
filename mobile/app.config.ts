import type { ExpoConfig } from 'expo/config';

const isProductionBuild = process.env.EXPO_PUBLIC_APP_ENV === 'production';

const config: ExpoConfig = {
  name: 'Estoque Tools',
  slug: 'estoque-tools',
  owner: 'cicerodoliver',
  version: '1.0.0',
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#0B2F57',
  extra: {
    eas: {
      projectId: '73062e90-db02-413a-9b68-cd105d86d16c',
    },
  },
  android: {
    package: 'com.equipe.estoquetools',
    versionCode: 1,
    allowBackup: false,
    icon: './assets/icon.png',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/monochrome-icon.png',
      backgroundColor: '#1559A6',
    },
    permissions: ['INTERNET'],
    blockedPermissions: [
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
    ],
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B2F57',
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: !isProductionBuild,
        },
      },
    ],
  ],
};

export default config;
