import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { secureSessionStorage } from '@/storage/secure-session';
import type { Account, MobileSession } from '@/types/api';
import {
  registerRefreshHandler,
  registerSessionExpiredHandler,
  setAccessToken,
  setActiveOrganizationId,
} from '@/api/session-coordinator';

type AuthStatus = 'restoring' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  account: Account | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [account, setAccount] = useState<Account | null>(null);

  const clearLocalSession = useCallback(async () => {
    setAccessToken(null);
    setActiveOrganizationId(null);
    await secureSessionStorage.clearSession();
    queryClient.clear();
    setAccount(null);
    setStatus('anonymous');
  }, [queryClient]);

  const applySession = useCallback(async (session: MobileSession): Promise<Account> => {
    setAccessToken(session.accessToken);
    await secureSessionStorage.setRefreshToken(session.refreshToken);
    const currentAccount = await authService.me();
    setAccount(currentAccount);
    setStatus('authenticated');
    return currentAccount;
  }, []);

  const refresh = useCallback(async (): Promise<string> => {
    const currentRefreshToken = await secureSessionStorage.getRefreshToken();
    if (!currentRefreshToken) throw new Error('Sessão não disponível');
    const session = await authService.refresh(currentRefreshToken);
    setAccessToken(session.accessToken);
    await secureSessionStorage.setRefreshToken(session.refreshToken);
    return session.accessToken;
  }, []);

  useEffect(() => {
    registerRefreshHandler(refresh);
    registerSessionExpiredHandler(clearLocalSession);
    return () => {
      registerRefreshHandler(null);
      registerSessionExpiredHandler(null);
    };
  }, [clearLocalSession, refresh]);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const currentRefreshToken = await secureSessionStorage.getRefreshToken();
        if (!currentRefreshToken) {
          if (active) setStatus('anonymous');
          return;
        }
        const session = await authService.refresh(currentRefreshToken);
        if (active) await applySession(session);
      } catch {
        if (active) await clearLocalSession();
      }
    }
    void restoreSession();
    return () => { active = false; };
  }, [applySession, clearLocalSession]);

  const login = useCallback(async (email: string, senha: string) => {
    const session = await authService.login(email.trim().toLowerCase(), senha);
    await applySession(session);
  }, [applySession]);

  const logout = useCallback(async () => {
    const refreshToken = await secureSessionStorage.getRefreshToken();
    try {
      if (refreshToken) await authService.logout(refreshToken);
    } finally {
      await clearLocalSession();
    }
  }, [clearLocalSession]);

  const value = useMemo(() => ({ status, account, login, logout }), [account, login, logout, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
