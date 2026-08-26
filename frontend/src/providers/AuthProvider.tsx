import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { organizationStore } from '../lib/organization-store'
import { sessionStore } from '../lib/session-store'
import { authService, type LoginInput, type RegisterInput } from '../services/auth-service'
import type { Account } from '../types/api'

type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated'

interface AuthContextValue {
  status: AuthStatus
  account: Account | null
  login: (input: LoginInput) => Promise<Account>
  register: (input: RegisterInput) => Promise<Account>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('anonymous')
  const [account, setAccount] = useState<Account | null>(null)

  useEffect(() => sessionStore.subscribe((session) => {
    if (!session) {
      setAccount(null)
      setStatus('anonymous')
      organizationStore.clear()
    }
  }), [])

  const login = useCallback(async (input: LoginInput) => {
    setStatus('authenticating')
    try {
      const session = await authService.login(input)
      sessionStore.set(session)
      const currentAccount = await authService.me()
      setAccount(currentAccount)
      setStatus('authenticated')
      return currentAccount
    } catch (error) {
      sessionStore.clear()
      setStatus('anonymous')
      throw error
    }
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    await authService.register(input)
    return login({ email: input.email, senha: input.senha })
  }, [login])

  const logout = useCallback(async () => {
    const refreshToken = sessionStore.get()?.refreshToken
    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } finally {
      sessionStore.clear()
    }
  }, [])

  const value = useMemo(() => ({ status, account, login, register, logout }), [
    account,
    login,
    logout,
    register,
    status,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
