import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Snackbar, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ToolStackParamList } from '@/navigation/types';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { toolKeys, toolService } from '@/services/tool-service';
import { ToolActionDialog } from '@/features/tools/ToolActionDialog';
import { useToolActions } from '@/features/tools/use-tool-actions';
import {
  actionLabels,
  administrativeToolActions,
  formatLocalDateTime,
  movementLabels,
  movementSummary,
  operationalToolActions,
  toolCurrentLocation,
  toolStatusColor,
  toolStatusLabel,
} from '@/features/tools/tool-ui';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<ToolStackParamList, 'ToolDetails'>;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function ToolDetailsScreen({ route }: Props) {
  const { toolId } = route.params;
  const { account } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id ?? 0;
  const profile = activeOrganization?.perfil ?? 'CONSULTA';
  const actions = useToolActions(organizationId);

  const detailQuery = useQuery({
    queryKey: toolKeys.detail(organizationId, toolId),
    queryFn: () => toolService.get(toolId),
    enabled: organizationId > 0,
  });
  const historyQuery = useQuery({
    queryKey: toolKeys.history(organizationId, toolId),
    queryFn: () => toolService.history(toolId),
    enabled: organizationId > 0,
  });
  const history = useMemo(() => [...(historyQuery.data ?? [])].sort((left, right) => (
    new Date(right.dataHora).getTime() - new Date(left.dataHora).getTime() || right.id - left.id
  )), [historyQuery.data]);

  if (detailQuery.isLoading) {
    return <View style={styles.center}><ActivityIndicator /><Text>Carregando ferramenta</Text></View>;
  }
  if (!detailQuery.data || detailQuery.isError) {
    return (
      <View style={styles.center}>
        <Text>Não foi possível carregar a ferramenta.</Text>
        <Button mode="outlined" onPress={() => void detailQuery.refetch()}>Tentar novamente</Button>
      </View>
    );
  }

  const tool = detailQuery.data;
  const operationalActions = operationalToolActions(tool, profile, account);
  const adminActions = administrativeToolActions(tool, profile);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.asset}>{tool.patrimonio}</Text>
          <Text variant="headlineSmall" style={styles.title}>{tool.nome}</Text>
          <Text style={[styles.status, { color: toolStatusColor(tool) }]}>{toolStatusLabel(tool)}</Text>
        </View>

        <View style={styles.details}>
          {tool.categoria ? <DetailRow label="Categoria" value={tool.categoria} /> : null}
          <DetailRow label="Responsável" value={tool.responsavelAtualNome ?? '—'} />
          <DetailRow label="Destino" value={tool.destinoAtual ?? '—'} />
          <DetailRow
            label="Desde"
            value={tool.status === 'EMPRESTADA' ? formatLocalDateTime(tool.responsavelDesde) : '—'}
          />
          <DetailRow label="Onde está" value={toolCurrentLocation(tool)} />
          <DetailRow label="Local de guarda" value={tool.localizacao ?? 'Não informado'} />
          <DetailRow label="Cadastro" value={tool.ativo ? 'Ativo' : 'Inativo'} />
        </View>

        {operationalActions.length ? (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Ações</Text>
            <View style={styles.actions}>
              {operationalActions.map((action, index) => (
                <Button
                  key={action}
                  mode={index === 0 ? 'contained' : 'outlined'}
                  onPress={() => actions.open(action, tool)}
                  buttonColor={action === 'loss' ? colors.danger : undefined}
                  textColor={action === 'loss' ? '#FFFFFF' : undefined}
                  contentStyle={styles.actionButton}
                >
                  {actionLabels[action]}
                </Button>
              ))}
            </View>
          </View>
        ) : null}

        {adminActions.length ? (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Cadastro</Text>
            <View style={styles.actions}>
              {adminActions.map((action) => (
                <Button
                  key={action}
                  mode="outlined"
                  onPress={() => actions.open(action, tool)}
                  textColor={action === 'inactivate' ? colors.danger : undefined}
                  contentStyle={styles.actionButton}
                >
                  {actionLabels[action]}
                </Button>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Histórico</Text>
          {historyQuery.isLoading ? (
            <View style={styles.inlineLoading}><ActivityIndicator size="small" /><Text>Carregando histórico</Text></View>
          ) : null}
          {historyQuery.isError ? (
            <View style={styles.historyState}>
              <Text>Não foi possível carregar o histórico.</Text>
              <Button onPress={() => void historyQuery.refetch()}>Tentar novamente</Button>
            </View>
          ) : null}
          {!historyQuery.isLoading && !historyQuery.isError && history.length === 0 ? (
            <Text style={styles.empty}>Nenhuma movimentação registrada.</Text>
          ) : null}
          {history.map((movement) => (
            <View key={movement.id} style={styles.historyRow} testID={`tool-movement-${movement.id}`}>
              <View style={styles.historyHeading}>
                <Text style={styles.historyTitle}>{movementLabels[movement.tipoMovimentacao]}</Text>
                <Text style={styles.historyDate}>{formatLocalDateTime(movement.dataHora)}</Text>
              </View>
              <Text style={styles.historySummary}>{movementSummary(movement)}</Text>
              <Text style={styles.historyMeta}>Por {movement.usuarioNome}</Text>
              {movement.destino ? <Text style={styles.historyMeta}>Destino: {movement.destino}</Text> : null}
              {movement.observacao ? <Text style={styles.historyNote}>{movement.observacao}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <ToolActionDialog
        action={actions.action}
        tool={actions.tool}
        responsibles={actions.responsibles}
        responsiblesLoading={actions.responsiblesLoading}
        responsiblesError={actions.responsiblesError}
        pending={actions.pending}
        requestError={actions.error}
        onClose={actions.close}
        onSubmit={actions.submit}
      />
      <Snackbar visible={Boolean(actions.feedback)} onDismiss={actions.clearFeedback} duration={3000}>
        {actions.feedback}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  heading: { gap: spacing.xs },
  asset: { color: colors.textMuted },
  title: { color: colors.text, fontWeight: '800' },
  status: { fontWeight: '800' },
  details: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { color: colors.textMuted, flex: 1 },
  detailValue: { color: colors.text, fontWeight: '600', flex: 1.4, textAlign: 'right' },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontWeight: '800' },
  actions: { gap: spacing.sm },
  actionButton: { minHeight: 48 },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyState: { alignItems: 'flex-start', gap: spacing.xs },
  empty: { color: colors.textMuted, paddingVertical: spacing.sm },
  historyRow: { backgroundColor: colors.surface, paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: 1 },
  historyHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  historyTitle: { color: colors.text, fontWeight: '700', flex: 1 },
  historyDate: { color: colors.textMuted, fontSize: 12 },
  historySummary: { color: colors.text, marginTop: spacing.xs },
  historyMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  historyNote: { color: colors.text, marginTop: spacing.xs },
});
