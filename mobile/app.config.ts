import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Estoque Tools',
  slug: 'estoque-tools',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.equipe.estoquetools',
    permissions: ['INTERNET'],
    blockedPermissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins: ['expo-secure-store'],
};

export default config;
