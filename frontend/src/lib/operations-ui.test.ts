import { combineMovements, filterMovements } from './operations-ui'
import type { StockMovement, ToolMovement } from '../types/api'

const toolBase: ToolMovement = {
  id: 1,
  ferramentaId: 10,
  ferramentaNome: 'Furadeira Bosch',
  ferramentaPatrimonio: 'PAT-010',
  usuarioId: 7,
  usuarioNome: 'Maria Oliveira',
  responsavelUsuarioId: 9,
  responsavelUsuarioNome: 'João Silva',
  responsavelAnteriorUsuarioId: 8,
  responsavelAnteriorUsuarioNome: 'Carlos Souza',
  tipoMovimentacao: 'RETIRADA',
  dataHora: '2026-08-27T12:00:00Z',
  observacao: 'Uso na linha',
  destino: 'Linha 3',
  statusRevisao: 'PENDENTE',
  confirmadoPorUsuarioId: null,
  confirmadoPorUsuarioNome: null,
  confirmadoEm: null,
}

const stockBase: StockMovement = {
  id: 2,
  itemEstoqueId: 20,
  itemEstoqueNome: 'Cabo CAT6',
  usuarioId: 7,
  usuarioNome: 'Maria Oliveira',
  tipoMovimentacao: 'ENTRADA',
  quantidade: 50,
  dataHora: '2026-08-27T13:00:00',
  observacao: 'Compra mensal',
}

describe('composição operacional de movimentações', () => {
  it('combina ferramentas e estoque em ordem cronológica decrescente', () => {
    const result = combineMovements([toolBase], [stockBase])
    expect(result.map((item) => item.key)).toEqual(['stock-2', 'tool-1'])
  })

  it.each([
    ['RETIRADA', 'Retirada'],
    ['DEVOLUCAO', 'Devolução'],
    ['TRANSFERENCIA', 'Transferência'],
    ['MANUTENCAO', 'Manutenção'],
    ['CONCLUSAO_MANUTENCAO', 'Manutenção concluída'],
    ['PERDA', 'Perda'],
    ['CORRECAO', 'Correção'],
  ] as const)('traduz %s para %s', (tipo, label) => {
    const [result] = combineMovements([{ ...toolBase, tipoMovimentacao: tipo }], [])
    expect(result.typeLabel).toBe(label)
    expect(result.sentence).not.toContain(tipo)
  })

  it.each([
    ['ENTRADA', 50, 'Entrada de 50 unidades de Cabo CAT6'],
    ['SAIDA', 12, 'Saída de 12 unidades de Cabo CAT6'],
    ['CORRECAO', 30, 'Estoque de Cabo CAT6 corrigido para 30 unidades'],
  ] as const)('traduz movimentação de estoque %s', (tipo, quantidade, sentence) => {
    const [result] = combineMovements([], [{ ...stockBase, tipoMovimentacao: tipo, quantidade }])
    expect(result.sentence).toBe(sentence)
  })

  it('filtra origem, conferência e busca sem acentos', () => {
    const movements = combineMovements([toolBase], [stockBase])
    expect(filterMovements(movements, 'tools', '')).toHaveLength(1)
    expect(filterMovements(movements, 'stock', '')).toHaveLength(1)
    expect(filterMovements(movements, 'pending', '')).toHaveLength(1)
    expect(filterMovements(movements, 'confirmed', '')).toHaveLength(0)
    expect(filterMovements(movements, 'all', 'furadeira joao')).toHaveLength(1)
  })
})
