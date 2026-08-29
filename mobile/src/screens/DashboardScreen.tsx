import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { loadDashboard, type DashboardData } from '@/services/dashboard-service';
import type { MemberProfile, Tool } from '@/types/api';
import { colors, spacing } from '@/theme';

export interface DashboardViewModel {
  total: number;
  available: number;
  inUse: Tool[];
  withCurrentAccount: Tool[];
  pendingCount: number;
  maintenanceCount: number;
  lostCount: number;
  lowStockCount: number;
}

export function buildDashboardViewModel(
  data: DashboardData,
  accountId: number,
  profile: MemberProfile,
): DashboardViewModel {
  const activeTools = data.tools.filter((tool) => tool.ativo);
  return {
    total: activeTools.length,
    available: activeTools.filter((tool) => tool.status === 'DISPONIVEL').length,
    inUse: data.borrowedTools,
    withCurrentAccount: data.borrowedTools.filter((tool) => tool.responsavelAtualId === accountId),
    pendingCount: profile === 'ADMIN' ? data.pendingMovements.length : 0,
    maintenanceCount: activeTools.filter((tool) => tool.status === 'MANUTENCAO').length,
    lostCount: activeTools.filter((tool) => tool.status === 'PERDIDA').length,
    lowStockCount: data.lowStockItems.length,
  };
}

function ToolRow({ tool }: { tool: Tool }) {
  return (
    <View style={styles.listRow}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{tool.nome}</Text>
        <Text style={styles.rowMeta}>{tool.patrimonio}</Text>
      </View>
      <View style={styles.rowDetail}>
        <Text style={styles.rowText}>{tool.responsavelAtualNome ?? 'Sem responsável'}</Text>
        <Text style={styles.rowMeta}>{tool.destinoAtual ?? 'Destino não informado'}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function DashboardScreen() {
  const { account } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id ?? 0;
  const profile = activeOrganization?.perfil ?? 'CONSULTA';
  const dashboardQuery = useQuery({
    queryKey: ['organization', organizationId, 'dashboard'],
    queryFn: () => loadDashboard(profile),
    enabled: organizationId > 0,
  });
  const view = useMemo(
    () => dashboardQuery.data && account
      ? buildDashboardViewModel(dashboardQuery.data, account.id, profile)
      : null,
    [account, dashboardQuery.data, profile],
  );

  if (!view && dashboardQuery.isLoading) {
    return <View style={styles.center}><ActivityIndicator /><Text>Carregando</Text></View>;
  }

  if (!view || dashboardQuery.isError) {
    return (
      <View style={styles.center}>
        <Text>Não foi possível carregar o painel.</Text>
        <Text style={styles.retry} onPress={() => void dashboardQuery.refetch()}>Tentar novamente</Text>
      </View>
    );
  }

  const firstName = account?.nome.split(' ')[0] ?? '';
  const attentionItems = [
    profile === 'ADMIN' && view.pendingCount > 0 ? `${view.pendingCount} aguardando confirmação` : null,
    view.maintenanceCount > 0 ? `${view.maintenanceCount} em manutenção` : null,
    view.lostCount > 0 ? `${view.lostCount} perdida${view.lostCount > 1 ? 's' : ''}` : null,
    view.lowStockCount > 0 ? `${view.lowStockCount} alerta${view.lowStockCount > 1 ? 's' : ''} de estoque` : null,
  ].filter(Boolean) as string[];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={(
        <RefreshControl
          refreshing={dashboardQuery.isFetching}
          onRefresh={() => void dashboardQuery.refetch()}
          colors={[colors.primary]}
        />
      )}
    >
      <View style={styles.heading}>
        <Text style={styles.organization}>{activeOrganization?.nome}</Text>
        <Text variant="headlineSmall" style={styles.greeting}>Olá, {firstName}</Text>
      </View>

      <View style={styles.metrics} accessibilityLabel="Resumo de ferramentas">
        {[
          ['Total', view.total],
          ['Disponíveis', view.available],
          ['Em uso', view.inUse.length],
          ['Pendentes', view.pendingCount],
        ].map(([label, value]) => (
          <View style={styles.metric} key={String(label)}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Section title="Atenção agora">
        {attentionItems.length ? attentionItems.map((item) => (
          <View key={item} style={styles.attentionRow}><Text style={styles.attentionText}>{item}</Text></View>
        )) : <Text style={styles.emptyText}>Tudo em ordem</Text>}
      </Section>

      {view.withCurrentAccount.length > 0 ? (
        <Section title="Com você">
          {view.withCurrentAccount.map((tool) => <ToolRow key={tool.id} tool={tool} />)}
        </Section>
      ) : null}

      <Section title="Ferramentas em uso">
        {view.inUse.length
          ? view.inUse.map((tool) => <ToolRow key={tool.id} tool={tool} />)
          : <Text style={styles.emptyText}>Nenhuma ferramenta em uso</Text>}
      </Section>

      {profile === 'ADMIN' ? (
        <Section title="Confirmações pendentes">
          <Text style={styles.summaryText}>
            {view.pendingCount > 0 ? `${view.pendingCount} movimentação(ões)` : 'Sem novas movimentações'}
          </Text>
        </Section>
      ) : null}

      <Section title="Últimos registros">
        {(dashboardQuery.data?.movements ?? []).slice(0, 5).map((movement) => (
          <View key={movement.id} style={styles.listRow}>
            <Text style={styles.rowTitle}>{movement.ferramentaNome}</Text>
            <Text style={styles.rowMeta}>{movement.tipoMovimentacao.replaceAll('_', ' ')}</Text>
          </View>
        ))}
        {!dashboardQuery.data?.movements.length ? <Text style={styles.emptyText}>Nenhum registro</Text> : null}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  retry: { color: colors.primary, fontWeight: '700' },
  heading: { gap: spacing.xs },
  organization: { color: colors.textMuted, fontWeight: '600' },
  greeting: { color: colors.text, fontWeight: '800' },
  metrics: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  metric: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  metricValue: { color: colors.text, fontWeight: '800', fontSize: 18 },
  metricLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontWeight: '800' },
  attentionRow: { backgroundColor: colors.warningSoft, borderLeftWidth: 3, borderLeftColor: colors.warning, padding: 12 },
  attentionText: { color: colors.warning, fontWeight: '600' },
  listRow: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12, paddingHorizontal: 4, flexDirection: 'row', gap: spacing.md },
  rowMain: { flex: 1 },
  rowDetail: { flex: 1, alignItems: 'flex-end' },
  rowTitle: { color: colors.text, fontWeight: '700' },
  rowText: { color: colors.text },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textMuted, paddingVertical: spacing.sm },
  summaryText: { color: colors.text, paddingVertical: spacing.sm },
});
