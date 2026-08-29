import type { AccessTokenResponse, Account, Organization } from '../types/api'

export const sessionFixture: AccessTokenResponse = {
  tokenType: 'Bearer',
  accessToken: 'access-token-for-test',
  expiresIn: 900,
  expiresAt: '2026-08-21T15:15:00Z',
}

export const accountFixture: Account = {
  id: 7,
  nome: 'Maria Oliveira',
  email: 'maria@empresa.com',
  ativo: true,
  senhaAlteradaEm: '2026-08-20T10:00:00',
  ultimoLoginEm: '2026-08-21T12:00:00',
}

export const organizationFixture: Organization = {
  id: 12,
  nome: 'Almoxarifado Central',
  ativa: true,
  criadaEm: '2026-08-19T10:00:00',
  perfil: 'ADMIN',
  status: 'ATIVO',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
