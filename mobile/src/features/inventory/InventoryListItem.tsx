import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TouchableRipple } from 'react-native-paper';
import type { MemberProfile, StockItem } from '@/types/api';
import type { InventoryAction } from '@/services/inventory-service';
import {
  inventoryActionLabels,
  inventoryStatus,
  inventoryStatusColors,
  inventoryStatusLabels,
  primaryInventoryAction,
} from './inventory-ui';
import { colors, spacing } from '@/theme';

export function InventoryListItem({
  item,
  profile,
  officialLowStockIds,
  onOpen,
  onAction,
}: {
  item: StockItem;
  profile: MemberProfile;
  officialLowStockIds: ReadonlySet<number>;
  onOpen: () => void;
  onAction: (action: InventoryAction) => void;
}) {
  const status = inventoryStatus(item, officialLowStockIds);
  const primary = primaryInventoryAction(item, profile);
  return (
    <TouchableRipple
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Abrir detalhes de ${item.nome}`}
      style={styles.row}
      testID={`inventory-row-${item.id}`}
    >
      <View style={styles.content}>
        <View style={styles.heading}>
          <View style={styles.identity}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{item.nome}</Text>
            <Text style={styles.code}>{item.codigo}</Text>
          </View>
          <Text style={[styles.status, { color: inventoryStatusColors[status] }]}>
            {inventoryStatusLabels[status]}
          </Text>
        </View>
        <View style={styles.values}>
          <View style={styles.valueGroup}>
            <Text style={styles.label}>Quantidade</Text>
            <Text style={styles.quantity}>{item.quantidadeAtual}</Text>
          </View>
          <View style={styles.valueGroup}>
            <Text style={styles.label}>Mínimo</Text>
            <Text style={styles.value}>{item.quantidadeMinima}</Text>
          </View>
          <View style={styles.locationGroup}>
            <Text style={styles.label}>Local</Text>
            <Text style={styles.value} numberOfLines={1}>{item.localizacao || '—'}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Button compact mode="text" onPress={onOpen}>Detalhes</Button>
          {primary ? (
            <Button compact mode="contained-tonal" onPress={() => onAction(primary)}>
              {inventoryActionLabels[primary].replace(' de estoque', '')}
            </Button>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 },
  content: { paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm },
  heading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  identity: { flex: 1 },
  name: { color: colors.text, fontWeight: '700' },
  code: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  status: { fontWeight: '700', fontSize: 12, paddingTop: 2 },
  values: { flexDirection: 'row', gap: spacing.md },
  valueGroup: { minWidth: 62 },
  locationGroup: { flex: 1 },
  label: { color: colors.textMuted, fontSize: 11 },
  quantity: { color: colors.text, fontWeight: '800', fontSize: 17, marginTop: 2 },
  value: { color: colors.text, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
