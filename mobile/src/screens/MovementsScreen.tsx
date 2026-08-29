import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Searchbar, Snackbar, Text } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/providers/OrganizationProvider';
import { invalidateMovementCaches, movementKeys, movementService } from '@/services/movement-service';
import { MovementListItem } from '@/features/movements/MovementListItem';
import { ConfirmMovementDialog, MovementDetailsDialog } from '@/features/movements/MovementDialogs';
import {
  combineMovements,
  confirmationError,
  filterMovements,
  movementFilterLabels,
  type MovementFilter,
  type UnifiedMovement,
} from '@/features/movements/movement-ui';
import { colors, spacing } from '@/theme';

const filters: MovementFilter[] = ['all', 'tools', 'stock', 'pending', 'confirmed'];

export function MovementsScreen() {
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id ?? 0;
  const admin = activeOrganization?.perfil === 'ADMIN';
  const [filter, setFilter] = useState<MovementFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UnifiedMovement | null>(null);
  const [confirming, setConfirming] = useState<UnifiedMovement | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => {
    setFilter('all');
    setSearch('');
    setSelected(null);
    setConfirming(null);
  }, [organizationId]);

  const toolsQuery = useQuery({ queryKey: movementKeys.tools(organizationId), queryFn: movementService.listTools, enabled: organizationId > 0 });
  const stockQuery = useQuery({ queryKey: movementKeys.stock(organizationId), queryFn: movementService.listStock, enabled: organizationId > 0 });
  const pendingQuery = useQuery({ queryKey: movementKeys.pending(organizationId), queryFn: movementService.listPending, enabled: organizationId > 0 && admin });
  const movements = useMemo(() => combineMovements(toolsQuery.data ?? [], stockQuery.data ?? []), [stockQuery.data, toolsQuery.data]);
  const visible = useMemo(() => filterMovements(movements, filter, search), [filter, movements, search]);
  const pendingCount = admin ? (pendingQuery.data?.length ?? movements.filter((item) => item.reviewStatus === 'PENDENTE').length) : 0;
  const confirmation = useMutation({
    mutationFn: movementService.confirm,
    onSuccess: async () => {
      setFeedback('Movimentação confirmada.');
      setConfirming(null);
      setSelected(null);
      await invalidateMovementCaches(queryClient, organizationId);
    },
  });

  const loading = toolsQuery.isLoading || stockQuery.isLoading || (admin && pendingQuery.isLoading);
  const error = toolsQuery.isError || stockQuery.isError || (admin && pendingQuery.isError);
  const refresh = () => Promise.all([
    toolsQuery.refetch(), stockQuery.refetch(), ...(admin ? [pendingQuery.refetch()] : []),
  ]);
  if (loading) return <View style={styles.center}><ActivityIndicator /><Text>Carregando movimentações</Text></View>;
  if (error) return <View style={styles.center}><Text>Não foi possível carregar as movimentações.</Text><Button onPress={() => void refresh()}>Tentar novamente</Button></View>;

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.key}
        contentContainerStyle={visible.length ? styles.list : styles.emptyList}
        keyboardShouldPersistTaps="handled"
        refreshing={toolsQuery.isFetching || stockQuery.isFetching || pendingQuery.isFetching}
        onRefresh={() => void refresh()}
        ListHeaderComponent={(
          <View style={styles.header}>
            <View><Text variant="headlineSmall" style={styles.title}>Movimentações</Text><Text style={styles.organization}>{activeOrganization?.nome}</Text></View>
            <Searchbar placeholder="Buscar por item, pessoa ou destino" value={search} onChangeText={setSearch} onClearIconPress={() => setSearch('')} style={styles.search} inputStyle={styles.searchInput} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((item) => <Chip key={item} compact selected={filter === item} onPress={() => setFilter(item)}>{movementFilterLabels[item]}{item === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}</Chip>)}
            </ScrollView>
            <Text style={styles.count}>{visible.length} {visible.length === 1 ? 'registro' : 'registros'}</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{movements.length === 0 ? 'Nenhuma movimentação registrada.' : search.trim() ? `Nenhum resultado para “${search.trim()}”.` : filter === 'pending' ? 'Sem novas movimentações' : 'Nenhuma movimentação neste filtro.'}</Text>
            {search.trim() ? <Button onPress={() => setSearch('')}>Limpar busca</Button> : null}
            {!search.trim() && filter !== 'all' ? <Button onPress={() => setFilter('all')}>Limpar filtros</Button> : null}
          </View>
        )}
        renderItem={({ item }) => <MovementListItem movement={item} admin={admin} onOpen={() => setSelected(item)} onConfirm={() => { confirmation.reset(); setConfirming(item); }} />}
      />
      <MovementDetailsDialog movement={selected} admin={admin} onClose={() => setSelected(null)} onConfirm={(item) => { setSelected(null); confirmation.reset(); setConfirming(item); }} />
      <ConfirmMovementDialog movement={confirming} pending={confirmation.isPending} error={confirmation.error ? confirmationError(confirmation.error) : null} onClose={() => { if (!confirmation.isPending) { setConfirming(null); confirmation.reset(); } }} onConfirm={() => { if (confirming) void confirmation.mutateAsync(confirming.id).catch(() => undefined); }} />
      <Snackbar visible={Boolean(feedback)} onDismiss={() => setFeedback(null)}>{feedback}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  list: { paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  header: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background },
  title: { color: colors.text, fontWeight: '800' },
  organization: { color: colors.textMuted, marginTop: 2 },
  search: { backgroundColor: colors.surface, borderRadius: 8, minHeight: 48 },
  searchInput: { minHeight: 48, fontSize: 15 },
  filters: { gap: spacing.sm, paddingRight: spacing.md },
  count: { color: colors.textMuted, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
