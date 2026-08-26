import type { AccessTokenResponse } from '../types/api'

type Listener = (session: AccessTokenResponse | null) => void

let session: AccessTokenResponse | null = null
const listeners = new Set<Listener>()

export const sessionStore = {
  get: () => session,
  set: (nextSession: AccessTokenResponse) => {
    session = nextSession
    listeners.forEach((listener) => listener(session))
  },
  clear: () => {
    session = null
    listeners.forEach((listener) => listener(null))
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
