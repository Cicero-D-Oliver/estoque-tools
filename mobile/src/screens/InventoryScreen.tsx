import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Searchbar, Snackbar, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { InventoryStackParamList } from '@/navigation/types';
import { useOrganization } from '@/providers/OrganizationProvider';
import { inventoryKeys, inventoryService, type InventoryAction } from '@/services/inventory-service';
import { InventoryActionDialog } from '@/features/inventory/InventoryActionDialog';
import { InventoryListItem } from '@/features/inventory/InventoryListItem';
import { useInventoryActions } from '@/features/inventory/use-inventory-actions';
import {
  filterInventory,
  inventoryFilterLabels,
  type InventoryFilter,
} from '@/features/inventory/inventory-ui';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<InventoryStackParamList, 'InventoryList'>;
const filters: InventoryFilter[] = ['active', 'low', 'normal', 'empty', 'inactive'];

export function InventoryScreen({ navigation }: Props) {
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id ?? 0;
  const profile = activeOrganization?.perfil ?? 'CONSULTA';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InventoryFilter>('active');
  const actions = useInventoryActions(organizationId);
  useEffect(() => {
    setSearch('');
    setFilter('active');
  }, [organizationId]);

  const itemsQuery = useQuery({
    queryKey: inventoryKeys.list(organizationId),
    queryFn: inventoryService.list,
    enabled: organizationId > 0,
  });
  const lowStockQuery = useQuery({
    queryKey: inventoryKeys.lowStock(organizationId),
    queryFn: inventoryService.lowStock,
    enabled: organizationId > 0,
  });
  const items = itemsQuery.data ?? [];
  const lowStockIds = useMemo(() => new Set(
    (lowStockQuery.data ?? items.filter((item) => item.abaixoMinimo)).map((item) => item.id),
  ), [items, lowStockQuery.data]);
  const visibleItems = useMemo(() => filterInventory(
    [...items].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR')
      || left.codigo.localeCompare(right.codigo, 'pt-BR')),
    filter,
    search,
    lowStockIds,
  ), [filter, items, lowStockIds, search]);

  function openAction(action: InventoryAction, itemId: number) {
    actions.open(action, items.find((item) => item.id === itemId) ?? null);
  }

  if (itemsQuery.isLoading) {
    return <View style={styles.center}><ActivityIndicator /><Text>Carregando estoque</Text></View>;
  }
  if (itemsQuery.isError) {
    return (
      <View style={styles.center}>
        <Text>Não foi possível carregar o estoque.</Text>
        <Button mode="outlined" onPress={() => void itemsQuery.refetch()}>Tentar novamente</Button>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={visibleItems.length ? styles.list : styles.emptyList}
        keyboardShouldPersistTaps="handled"
        onRefresh={() => void Promise.all([itemsQuery.refetch(), lowStockQuery.refetch()])}
        refreshing={itemsQuery.isFetching || lowStockQuery.isFetching}
        ListHeaderComponent={(
          <View style={styles.header}>
            <View style={styles.heading}>
              <View>
                <Text variant="headlineSmall" style={styles.title}>Estoque</Text>
                <Text style={styles.organization}>{activeOrganization?.nome}</Text>
              </View>
              {profile === 'ADMIN' ? (
                <Button compact mode="contained" icon="plus" onPress={() => actions.open('create')}>Novo</Button>
              ) : null}
            </View>
            <Searchbar
              placeholder="Buscar por nome ou código"
              value={search}
              onChangeText={setSearch}
              onClearIconPress={() => setSearch('')}
              style={styles.search}
              inputStyle={styles.searchInput}
              testID="inventory-search"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((item) => (
                <Chip
                  key={item}
                  selected={filter === item}
                  onPress={() => setFilter(item)}
                  compact
                  testID={`inventory-filter-${item}`}
                >
                  {inventoryFilterLabels[item]}
                </Chip>
              ))}
            </ScrollView>
            {lowStockQuery.isError ? (
              <Text style={styles.warning}>Não foi possível atualizar os alertas de estoque.</Text>
            ) : null}
            <Text style={styles.count}>{visibleItems.length} {visibleItems.length === 1 ? 'encontrado' : 'encontrados'}</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {items.length === 0
                ? 'Nenhum item cadastrado.'
                : search.trim() ? `Nenhum item encontrado para “${search.trim()}”.` : 'Nenhum item neste filtro.'}
            </Text>
            {search.trim() ? <Button onPress={() => setSearch('')}>Limpar busca</Button> : null}
            {!search.trim() && filter !== 'active' ? <Button onPress={() => setFilter('active')}>Limpar filtros</Button> : null}
            {items.length === 0 && profile === 'ADMIN' ? (
              <Button mode="contained-tonal" onPress={() => actions.open('create')}>Cadastrar item</Button>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => (
          <InventoryListItem
            item={item}
            profile={profile}
            officialLowStockIds={lowStockIds}
            onOpen={() => navigation.navigate('InventoryDetails', { itemId: item.id })}
            onAction={(action) => openAction(action, item.id)}
          />
        )}
      />
      <InventoryActionDialog
        action={actions.action}
        item={actions.item}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  list: { paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  header: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontWeight: '800' },
  organization: { color: colors.textMuted, marginTop: 2 },
  search: { backgroundColor: colors.surface, borderRadius: 8, minHeight: 48 },
  searchInput: { minHeight: 48, fontSize: 15 },
  filters: { gap: spacing.sm, paddingRight: spacing.md },
  count: { color: colors.textMuted, fontSize: 12 },
  warning: { color: colors.warning, backgroundColor: colors.warningSoft, padding: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
