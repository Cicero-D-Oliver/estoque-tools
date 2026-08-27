import {
  canWriteStock,
  filterInventory,
  inventoryStatus,
  inventoryStatusLabel,
  normalizeInventorySearch,
  stockMovementSentence,
} from './inventory-ui'
import type { StockItem, StockMovement } from '../types/api'

const normal: StockItem = {
  id: 1,
  codigo: 'PARAF-001',
  nome: 'Parafuso sextavado',
  categoria: 'Fixadores',
  quantidadeAtual: 100,
  quantidadeMinima: 20,
  localizacao: 'Corredor A',
  ativo: true,
  abaixoMinimo: false,
}

describe('regras de apresentação do estoque', () => {
  it('normaliza espaços, caixa e acentos na busca', () => {
    expect(normalizeInventorySearch('  ConexÃO  ')).toBe('conexao')
  })

  it('busca por nome ou código', () => {
    expect(filterInventory([normal], 'active', 'SEXTAVADO', new Set())).toEqual([normal])
    expect(filterInventory([normal], 'active', 'paraf-001', new Set())).toEqual([normal])
  })

  it('usa a lista oficial do backend para abaixo do mínimo', () => {
    expect(inventoryStatus(normal, new Set([normal.id]))).toBe('low')
    expect(filterInventory([{ ...normal, quantidadeAtual: 0 }], 'low', '', new Set([normal.id])))
      .toHaveLength(1)
  })

  it('prioriza sem estoque sobre abaixo do mínimo', () => {
    expect(inventoryStatus({ ...normal, quantidadeAtual: 0 }, new Set([normal.id]))).toBe('empty')
  })

  it('prioriza cadastro inativo sobre saldo', () => {
    expect(inventoryStatus({ ...normal, ativo: false, quantidadeAtual: 0 }, new Set([normal.id]))).toBe('inactive')
  })

  it.each([
    ['normal', 'Normal'],
    ['low', 'Abaixo do mínimo'],
    ['empty', 'Sem estoque'],
    ['inactive', 'Inativo'],
  ] as const)('traduz o estado %s', (status, label) => {
    expect(inventoryStatusLabel(status)).toBe(label)
  })

  it('autoriza escrita apenas para ADMIN e OPERADOR', () => {
    expect(canWriteStock('ADMIN')).toBe(true)
    expect(canWriteStock('OPERADOR')).toBe(true)
    expect(canWriteStock('CONSULTA')).toBe(false)
  })

  it.each([
    ['ENTRADA', 1, 'Entrada de 1 unidade'],
    ['SAIDA', 12, 'Saída de 12 unidades'],
    ['CORRECAO', -4, 'Correção de estoque'],
  ] as const)('apresenta movimentação %s sem enum cru', (tipoMovimentacao, quantidade, expected) => {
    const movement = { tipoMovimentacao, quantidade } as StockMovement
    expect(stockMovementSentence(movement)).toBe(expected)
  })
})
