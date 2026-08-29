import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Searchbar, Snackbar, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { toolKeys, toolService, type ToolAction } from '@/services/tool-service';
import type { ToolStackParamList } from '@/navigation/types';
import { ToolListItem } from '@/features/tools/ToolListItem';
import { ToolActionDialog } from '@/features/tools/ToolActionDialog';
import { useToolActions } from '@/features/tools/use-tool-actions';
import {
  filterLabels,
  filterTools,
  type ToolFilter,
} from '@/features/tools/tool-ui';
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<ToolStackParamList, 'ToolList'>;

const baseFilters: ToolFilter[] = [
  'active', 'available', 'borrowed', 'maintenance', 'lost', 'inactive',
];

export function ToolsScreen({ navigation }: Props) {
  const { account } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id ?? 0;
  const profile = activeOrganization?.perfil ?? 'CONSULTA';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ToolFilter>('active');
  const actions = useToolActions(organizationId);

  useEffect(() => {
    setSearch('');
    setFilter('active');
  }, [organizationId]);

  const toolsQuery = useQuery({
    queryKey: toolKeys.list(organizationId),
    queryFn: toolService.list,
    enabled: organizationId > 0,
  });
  const tools = toolsQuery.data ?? [];
  const visibleTools = useMemo(() => {
    const sorted = [...tools].sort((left, right) => (
      left.nome.localeCompare(right.nome, 'pt-BR')
      || left.patrimonio.localeCompare(right.patrimonio, 'pt-BR')
    ));
    return filterTools(sorted, filter, search, account?.id);
  }, [account?.id, filter, search, tools]);
  const filters = profile === 'ADMIN' || profile === 'OPERADOR'
    ? [...baseFilters, 'mine' as const]
    : baseFilters;

  function openAction(action: ToolAction, toolId: number) {
    const tool = tools.find((candidate) => candidate.id === toolId) ?? null;
    actions.open(action, tool);
  }

  if (toolsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Carregando ferramentas</Text>
      </View>
    );
  }

  if (toolsQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Não foi possível carregar as ferramentas.</Text>
        <Button mode="outlined" onPress={() => void toolsQuery.refetch()}>Tentar novamente</Button>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleTools}
        keyExtractor={(tool) => String(tool.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={visibleTools.length ? styles.list : styles.emptyList}
        onRefresh={() => void toolsQuery.refetch()}
        refreshing={toolsQuery.isFetching}
        ListHeaderComponent={(
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <View>
                <Text variant="headlineSmall" style={styles.title}>Ferramentas</Text>
                <Text style={styles.organization}>{activeOrganization?.nome}</Text>
              </View>
              {profile === 'ADMIN' ? (
                <Button compact mode="contained" icon="plus" onPress={() => actions.open('create')}>
                  Nova
                </Button>
              ) : null}
            </View>
            <Searchbar
              placeholder="Buscar por nome ou patrimônio"
              value={search}
              onChangeText={setSearch}
              onClearIconPress={() => setSearch('')}
              style={styles.search}
              inputStyle={styles.searchInput}
              testID="tool-search"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              accessibilityLabel="Filtros de ferramentas"
            >
              {filters.map((item) => (
                <Chip
                  key={item}
                  selected={filter === item}
                  onPress={() => setFilter(item)}
                  compact
                  testID={`tool-filter-${item}`}
                >
                  {filterLabels[item]}
                </Chip>
              ))}
            </ScrollView>
            <Text style={styles.count} accessibilityRole="text">
              {visibleTools.length} {visibleTools.length === 1 ? 'encontrada' : 'encontradas'}
            </Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tools.length === 0
                ? 'Nenhuma ferramenta cadastrada.'
                : search.trim()
                  ? `Nenhuma ferramenta encontrada para “${search.trim()}”.`
                  : 'Nenhuma ferramenta neste filtro.'}
            </Text>
            {search.trim() ? <Button onPress={() => setSearch('')}>Limpar busca</Button> : null}
            {!search.trim() && filter !== 'active' ? (
              <Button onPress={() => setFilter('active')}>Limpar filtros</Button>
            ) : null}
            {tools.length === 0 && profile === 'ADMIN' ? (
              <Button mode="contained-tonal" onPress={() => actions.open('create')}>
                Cadastrar ferramenta
              </Button>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => (
          <ToolListItem
            tool={item}
            profile={profile}
            onOpen={() => navigation.navigate('ToolDetails', { toolId: item.id })}
            onAction={(action) => openAction(action, item.id)}
          />
        )}
      />

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
      <Snackbar
        visible={Boolean(actions.feedback)}
        onDismiss={actions.clearFeedback}
        duration={3000}
      >
        {actions.feedback}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorTitle: { color: colors.text, textAlign: 'center' },
  list: { paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  header: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontWeight: '800' },
  organization: { color: colors.textMuted, marginTop: 2 },
  search: { backgroundColor: colors.surface, borderRadius: 8, minHeight: 48 },
  searchInput: { minHeight: 48, fontSize: 15 },
  filters: { gap: spacing.sm, paddingRight: spacing.md },
  count: { color: colors.textMuted, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
