import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/config/environment';
import {
  getAccessToken,
  getActiveOrganizationId,
  notifySessionExpired,
  refreshAccessToken,
} from './session-coordinator';

declare module 'axios' {
  interface AxiosRequestConfig {
    organization?: boolean;
    skipAuthRefresh?: boolean;
    retriedAfterRefresh?: boolean;
  }

  interface InternalAxiosRequestConfig {
    organization?: boolean;
    skipAuthRefresh?: boolean;
    retriedAfterRefresh?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12_000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshInFlight: Promise<string> | null = null;

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.organization) {
    const organizationId = getActiveOrganizationId();
    if (!organizationId) throw new Error('Selecione um ambiente para continuar.');
    config.headers['X-Organization-Id'] = String(organizationId);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config;
    if (
      error.response?.status !== 401
      || !request
      || request.skipAuthRefresh
      || request.retriedAfterRefresh
      || !getAccessToken()
    ) {
      return Promise.reject(error);
    }

    request.retriedAfterRefresh = true;
    try {
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const renewedAccessToken = await refreshInFlight;
      request.headers.Authorization = `Bearer ${renewedAccessToken}`;
      return apiClient.request(request);
    } catch {
      await notifySessionExpired();
      return Promise.reject(error);
    }
  },
);

export function resetApiClientForTests(): void {
  refreshInFlight = null;
}
