import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { organizationStore } from '../lib/organization-store'
import { sessionStore } from '../lib/session-store'

afterEach(() => {
  cleanup()
  sessionStore.clear()
  organizationStore.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
