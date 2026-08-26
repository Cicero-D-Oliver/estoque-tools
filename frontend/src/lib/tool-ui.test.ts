import { describe, expect, it } from 'vitest'
import { formatOperationalDateTime } from './format'
import {
  canTransfer,
  filterTools,
  movementSentence,
  normalizedSearch,
  primaryToolAction,
  toolCurrentLocation,
  toolStatusLabel,
} from './tool-ui'
import { accountFixture } from '../test/fixtures'
import type { Tool, ToolMovement } from '../types/api'

const available: Tool = {
  id: 1,
  patrimonio: 'PAT-Á01',
  nome: 'Furadeira Águia',
  categoria: 'Elétrica',
  status: 'DISPONIVEL',
  responsavelAtualId: null,
  responsavelAtualNome: null,
  responsavelDesde: null,
  destinoAtual: null,
  localizacao: 'Armário 2',
  ativo: true,
}

const borrowed: Tool = {
  ...available,
  id: 2,
  patrimonio: 'PAT-002',
  nome: 'Esmerilhadeira',
  status: 'EMPRESTADA',
  responsavelAtualId: accountFixture.id,
  responsavelAtualNome: accountFixture.nome,
  responsavelDesde: '2026-08-26T11:43:00Z',
  destinoAtual: 'Linha 3',
}

const maintenance: Tool = { ...available, id: 3, patrimonio: 'PAT-003', nome: 'Martelete', status: 'MANUTENCAO' }
const lost: Tool = { ...available, id: 4, patrimonio: 'PAT-004', nome: 'Alicate', status: 'PERDIDA' }
const inactive: Tool = { ...available, id: 5, patrimonio: 'PAT-005', nome: 'Serra antiga', ativo: false }
const tools = [available, borrowed, maintenance, lost, inactive]

const movement: ToolMovement = {
  id: 10,
  ferramentaId: 2,
  ferramentaNome: borrowed.nome,
  ferramentaPatrimonio: borrowed.patrimonio,
  usuarioId: accountFixture.id,
  usuarioNome: accountFixture.nome,
  responsavelUsuarioId: accountFixture.id,
  responsavelUsuarioNome: accountFixture.nome,
  responsavelAnteriorUsuarioId: null,
  responsavelAnteriorUsuarioNome: null,
  tipoMovimentacao: 'RETIRADA',
  dataHora: '2026-08-26T11:43:00Z',
  observacao: null,
  destino: 'Linha 3',
  statusRevisao: 'PENDENTE',
  confirmadoPorUsuarioId: null,
  confirmadoPorUsuarioNome: null,
  confirmadoEm: null,
}

describe('regras de apresentação de ferramentas', () => {
  it('normaliza caixa, espaços e acentos da busca', () => {
    expect(normalizedSearch('  FURADEIRA ÁGUIA  ')).toBe('furadeira aguia')
  })

  it('busca por nome sem depender de caixa ou acento', () => {
    expect(filterTools(tools, 'active', 'aguia')).toEqual([available])
  })

  it('busca por patrimônio normalizado', () => {
    expect(filterTools(tools, 'active', 'pat-á01')).toEqual([available])
  })

  it('mantém apenas ferramentas ativas no filtro inicial', () => {
    expect(filterTools(tools, 'active', '')).toHaveLength(4)
    expect(filterTools(tools, 'active', '')).not.toContain(inactive)
  })

  it.each([
    ['available', available],
    ['borrowed', borrowed],
    ['maintenance', maintenance],
    ['lost', lost],
    ['inactive', inactive],
  ] as const)('filtra corretamente o estado %s', (filter, expected) => {
    expect(filterTools(tools, filter, '')).toEqual([expected])
  })

  it('filtra Comigo pelo usuário autenticado', () => {
    expect(filterTools(tools, 'mine', '', accountFixture.id)).toEqual([borrowed])
    expect(filterTools(tools, 'mine', '', 999)).toEqual([])
  })

  it('traduz os estados sem expor enums', () => {
    expect(toolStatusLabel(available)).toBe('Disponível')
    expect(toolStatusLabel(borrowed)).toBe('Em uso')
    expect(toolStatusLabel(maintenance)).toBe('Manutenção')
    expect(toolStatusLabel(lost)).toBe('Perdida')
    expect(toolStatusLabel(inactive)).toBe('Inativa')
  })

  it('apresenta guarda, destino e ausências de forma operacional', () => {
    expect(toolCurrentLocation(available)).toBe('No almoxarifado · Armário 2')
    expect(toolCurrentLocation(borrowed)).toBe('Linha 3')
    expect(toolCurrentLocation({ ...borrowed, destinoAtual: null })).toBe('Destino não informado')
  })

  it('limita transferência do operador à ferramenta sob sua responsabilidade', () => {
    expect(canTransfer('OPERADOR', accountFixture, borrowed)).toBe(true)
    expect(canTransfer('OPERADOR', { ...accountFixture, id: 99 }, borrowed)).toBe(false)
    expect(canTransfer('ADMIN', accountFixture, borrowed)).toBe(true)
  })

  it('define a ação primária pelo estado e pelo perfil', () => {
    expect(primaryToolAction(available, 'OPERADOR')).toBe('withdraw')
    expect(primaryToolAction(borrowed, 'OPERADOR')).toBe('return')
    expect(primaryToolAction(maintenance, 'OPERADOR')).toBe('complete-maintenance')
    expect(primaryToolAction(available, 'CONSULTA')).toBeNull()
  })

  it('transforma o histórico em frases operacionais', () => {
    expect(movementSentence(movement)).toBe('Retirada por Maria Oliveira')
    expect(movementSentence({ ...movement, tipoMovimentacao: 'DEVOLUCAO' })).toBe('Devolvida ao almoxarifado')
    expect(movementSentence({ ...movement, tipoMovimentacao: 'CONCLUSAO_MANUTENCAO' })).toBe('Manutenção concluída')
  })

  it('converte um instante UTC usando o horário local do navegador', () => {
    const instant = '2026-08-26T11:43:00Z'
    const localTime = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(instant))

    expect(formatOperationalDateTime(instant, new Date('2026-08-26T18:00:00Z'))).toBe(`Hoje, ${localTime}`)
  })
})
