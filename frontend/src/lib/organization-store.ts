type Listener = (organizationId: number | null) => void

let selectedOrganizationId: number | null = null
const listeners = new Set<Listener>()

export const organizationStore = {
  get: () => selectedOrganizationId,
  set: (organizationId: number) => {
    selectedOrganizationId = organizationId
    listeners.forEach((listener) => listener(organizationId))
  },
  clear: () => {
    selectedOrganizationId = null
    listeners.forEach((listener) => listener(null))
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
