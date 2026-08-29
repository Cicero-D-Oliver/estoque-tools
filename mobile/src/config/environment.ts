const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

export const API_BASE_URL = configuredApiUrl
  ?? (appEnvironment === 'production' ? '' : 'http://10.0.2.2:8080');

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL deve ser informada para builds de produção.');
}

if (appEnvironment === 'production' && !API_BASE_URL.startsWith('https://')) {
  throw new Error('A API de produção do aplicativo deve usar HTTPS.');
}

export const APP_ENVIRONMENT = appEnvironment;
