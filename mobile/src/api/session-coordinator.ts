let accessToken: string | null = null;
let activeOrganizationId: number | null = null;
let refreshHandler: (() => Promise<string>) | null = null;
let sessionExpiredHandler: (() => Promise<void> | void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getActiveOrganizationId(): number | null {
  return activeOrganizationId;
}

export function setActiveOrganizationId(organizationId: number | null): void {
  activeOrganizationId = organizationId;
}

export function registerRefreshHandler(handler: (() => Promise<string>) | null): void {
  refreshHandler = handler;
}

export function registerSessionExpiredHandler(
  handler: (() => Promise<void> | void) | null,
): void {
  sessionExpiredHandler = handler;
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshHandler) throw new Error('Sessão não inicializada');
  return refreshHandler();
}

export async function notifySessionExpired(): Promise<void> {
  await sessionExpiredHandler?.();
}

export function resetSessionCoordinator(): void {
  accessToken = null;
  activeOrganizationId = null;
  refreshHandler = null;
  sessionExpiredHandler = null;
}
