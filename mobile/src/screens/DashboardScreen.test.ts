import { buildDashboardViewModel } from './DashboardScreen';
import type { DashboardData } from '@/services/dashboard-service';
import type { Tool } from '@/types/api';

const tool = (id: number, status: Tool['status'], responsibleId: number | null = null): Tool => ({
  id,
  patrimonio: `PAT-${id}`,
  nome: `Ferramenta ${id}`,
  categoria: null,
  status,
  responsavelAtualId: responsibleId,
  responsavelAtualNome: responsibleId ? `Pessoa ${responsibleId}` : null,
  responsavelDesde: responsibleId ? '2026-08-28T10:00:00Z' : null,
  destinoAtual: responsibleId ? 'Obra A' : null,
  localizacao: 'Armário',
  ativo: true,
});

const data: DashboardData = {
  tools: [tool(1, 'DISPONIVEL'), tool(2, 'EMPRESTADA', 7), tool(3, 'MANUTENCAO'), tool(4, 'PERDIDA')],
  borrowedTools: [tool(2, 'EMPRESTADA', 7)],
  movements: [],
  pendingMovements: [{ id: 8 } as DashboardData['pendingMovements'][number]],
  lowStockItems: [{ id: 9 } as DashboardData['lowStockItems'][number]],
};

test('Dashboard ADMIN mostra pendências e alertas operacionais', () => {
  const view = buildDashboardViewModel(data, 7, 'ADMIN');
  expect(view).toMatchObject({ total: 4, available: 1, pendingCount: 1, maintenanceCount: 1, lostCount: 1, lowStockCount: 1 });
});

test('Dashboard OPERADOR não consulta pendência administrativa no resumo', () => {
  expect(buildDashboardViewModel(data, 7, 'OPERADOR').pendingCount).toBe(0);
});

test('Dashboard CONSULTA mantém somente o resumo de leitura', () => {
  const view = buildDashboardViewModel(data, 99, 'CONSULTA');
  expect(view.pendingCount).toBe(0);
  expect(view.inUse).toHaveLength(1);
});

test('Dashboard identifica ferramentas sob responsabilidade da conta atual', () => {
  expect(buildDashboardViewModel(data, 7, 'OPERADOR').withCurrentAccount.map((item) => item.id)).toEqual([2]);
});
