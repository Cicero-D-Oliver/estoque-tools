import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Snackbar, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { InventoryStackParamList } from '@/navigation/types';
import { useOrganization } from '@/providers/OrganizationProvider';
import { inventoryKeys, inventoryService } from '@/services/inventory-service';
import { InventoryActionDialog } from '@/features/inventory/InventoryActionDialog';
import { useInventoryActions } from '@/features/inventory/use-inventory-actions';
import {
  canWriteInventory,
  inventoryStatus,
  inventoryStatusColors,
  inventoryStatusLabels,
  stockMovementSentence,
} from '@/features/inventory/inventory-ui';
import { formatLocalDateTime } from '@/features/tools/tool-ui';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<InventoryStackParamList, 'InventoryDetails'>;

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

export function InventoryDetailsScreen({ route }: Props) {
  const { itemId } = route.params;
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id ?? 0;
  const profile = activeOrganization?.perfil ?? 'CONSULTA';
  const actions = useInventoryActions(organizationId);
  const itemQuery = useQuery({
    queryKey: inventoryKeys.detail(organizationId, itemId),
    queryFn: () => inventoryService.get(itemId),
    enabled: organizationId > 0,
  });
  const lowStockQuery = useQuery({
    queryKey: inventoryKeys.lowStock(organizationId),
    queryFn: inventoryService.lowStock,
    enabled: organizationId > 0,
  });
  const historyQuery = useQuery({
    queryKey: inventoryKeys.history(organizationId, itemId),
    queryFn: () => inventoryService.history(itemId),
    enabled: organizationId > 0,
  });
  const history = useMemo(() => [...(historyQuery.data ?? [])].sort((left, right) => (
    new Date(right.dataHora).getTime() - new Date(left.dataHora).getTime() || right.id - left.id
  )), [historyQuery.data]);

  if (itemQuery.isLoading) return <View style={styles.center}><ActivityIndicator /><Text>Carregando item</Text></View>;
  if (!itemQuery.data || itemQuery.isError) {
    return <View style={styles.center}><Text>Não foi possível carregar o item.</Text><Button onPress={() => void itemQuery.refetch()}>Tentar novamente</Button></View>;
  }
  const item = itemQuery.data;
  const status = inventoryStatus(item, new Set(
    (lowStockQuery.data ?? (item.abaixoMinimo ? [item] : [])).map((candidate) => candidate.id),
  ));
  const writable = canWriteInventory(profile) && item.ativo;
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.code}>{item.codigo}</Text>
          <Text variant="headlineSmall" style={styles.title}>{item.nome}</Text>
          <Text style={[styles.status, { color: inventoryStatusColors[status] }]}>{inventoryStatusLabels[status]}</Text>
        </View>
        <View style={styles.details}>
          <DetailRow label="Quantidade" value={String(item.quantidadeAtual)} />
          <DetailRow label="Estoque mínimo" value={String(item.quantidadeMinima)} />
          <DetailRow label="Localização" value={item.localizacao || '—'} />
          <DetailRow label="Categoria" value={item.categoria || '—'} />
          <DetailRow label="Cadastro" value={item.ativo ? 'Ativo' : 'Inativo'} />
        </View>
        {writable ? (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Ações</Text>
            <Button mode="contained" contentStyle={styles.action} onPress={() => actions.open('entry', item)}>Registrar entrada</Button>
            {item.quantidadeAtual > 0 ? <Button mode="outlined" contentStyle={styles.action} onPress={() => actions.open('exit', item)}>Registrar saída</Button> : null}
          </View>
        ) : null}
        {profile === 'ADMIN' ? (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Cadastro</Text>
            <Button mode="outlined" contentStyle={styles.action} onPress={() => actions.open('edit', item)}>Editar</Button>
            {item.ativo ? <Button mode="outlined" contentStyle={styles.action} onPress={() => actions.open('correction', item)}>Corrigir estoque</Button> : null}
            {item.ativo ? <Button mode="outlined" textColor={colors.danger} contentStyle={styles.action} onPress={() => actions.open('inactivate', item)}>Inativar</Button> : null}
          </View>
        ) : null}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Histórico</Text>
          {historyQuery.isLoading ? <View style={styles.loading}><ActivityIndicator size="small" /><Text>Carregando histórico</Text></View> : null}
          {historyQuery.isError ? <Button onPress={() => void historyQuery.refetch()}>Tentar novamente</Button> : null}
          {!historyQuery.isLoading && !historyQuery.isError && !history.length ? <Text style={styles.empty}>Nenhuma movimentação registrada.</Text> : null}
          {history.map((movement) => (
            <View key={movement.id} style={styles.historyRow}>
              <View style={styles.historyHeading}>
                <Text style={styles.historyTitle}>{stockMovementSentence(movement)}</Text>
                <Text style={styles.historyDate}>{formatLocalDateTime(movement.dataHora)}</Text>
              </View>
              <Text style={styles.historyMeta}>Por {movement.usuarioNome}</Text>
              {movement.observacao ? <Text style={styles.historyNote}>{movement.observacao}</Text> : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <InventoryActionDialog action={actions.action} item={actions.item} pending={actions.pending} requestError={actions.error} onClose={actions.close} onSubmit={actions.submit} />
      <Snackbar visible={Boolean(actions.feedback)} onDismiss={actions.clearFeedback}>{actions.feedback}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  code: { color: colors.textMuted },
  title: { color: colors.text, fontWeight: '800', marginTop: 2 },
  status: { fontWeight: '800', marginTop: spacing.xs },
  details: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, padding: 12, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { color: colors.textMuted, flex: 1 },
  value: { color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontWeight: '800' },
  action: { minHeight: 48 },
  loading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  empty: { color: colors.textMuted, paddingVertical: spacing.sm },
  historyRow: { backgroundColor: colors.surface, paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: 1 },
  historyHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  historyTitle: { color: colors.text, fontWeight: '700', flex: 1 },
  historyDate: { color: colors.textMuted, fontSize: 12 },
  historyMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  historyNote: { color: colors.text, marginTop: spacing.xs },
});
