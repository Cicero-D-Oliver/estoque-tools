import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'estoque.refresh-token';
const ORGANIZATION_ID_KEY = 'estoque.organization-id';

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureSessionStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY, secureOptions),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, secureOptions),
  getOrganizationId: async (): Promise<number | null> => {
    const stored = await SecureStore.getItemAsync(ORGANIZATION_ID_KEY, secureOptions);
    if (!stored || !/^\d+$/.test(stored)) return null;
    return Number(stored);
  },
  setOrganizationId: (organizationId: number) => SecureStore.setItemAsync(
    ORGANIZATION_ID_KEY,
    String(organizationId),
    secureOptions,
  ),
  clearOrganization: () => SecureStore.deleteItemAsync(ORGANIZATION_ID_KEY),
  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(ORGANIZATION_ID_KEY),
    ]);
  },
};
