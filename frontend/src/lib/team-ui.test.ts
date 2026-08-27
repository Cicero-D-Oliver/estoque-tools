import { combineMembers, filterMembers, memberStatusLabels, profileLabels } from './team-ui'
import type { OrganizationMember } from '../types/api'

const member: OrganizationMember = {
  id: 1,
  organizacaoId: 12,
  usuarioId: 7,
  usuarioNome: 'Álvaro Souza',
  usuarioEmail: 'alvaro@empresa.com',
  perfil: 'ADMIN',
  status: 'ATIVO',
  solicitadoEm: '2026-08-20T10:00:00',
  aprovadoEm: '2026-08-20T11:00:00',
  aprovadoPorUsuarioId: 7,
  removidoEm: null,
}

describe('apresentação da equipe', () => {
  it('remove duplicidade entre membros e solicitações', () => {
    expect(combineMembers([member], [{ ...member, status: 'PENDENTE' }])).toEqual([
      expect.objectContaining({ id: 1, status: 'PENDENTE' }),
    ])
  })

  it('ordena pessoas pelo nome', () => {
    const result = combineMembers([{ ...member, id: 2, usuarioNome: 'Zilda' }], [member])
    expect(result.map((item) => item.usuarioNome)).toEqual(['Álvaro Souza', 'Zilda'])
  })

  it('filtra membros ativos', () => {
    const pending = { ...member, id: 2, status: 'PENDENTE' as const }
    expect(filterMembers([member, pending], 'active', '')).toEqual([member])
  })

  it('filtra solicitações pendentes', () => {
    const pending = { ...member, id: 2, status: 'PENDENTE' as const }
    expect(filterMembers([member, pending], 'pending', '')).toEqual([pending])
  })

  it('busca nome sem depender de acentuação', () => {
    expect(filterMembers([member], 'all', 'alvaro')).toEqual([member])
  })

  it('apresenta perfis sem enum técnico', () => {
    expect(profileLabels).toEqual({ ADMIN: 'Administrador', OPERADOR: 'Operador', CONSULTA: 'Consulta' })
  })

  it('apresenta estados reais em linguagem operacional', () => {
    expect(memberStatusLabels.PENDENTE).toBe('Aguardando aprovação')
    expect(memberStatusLabels.REMOVIDO).toBe('Acesso removido')
  })
})
