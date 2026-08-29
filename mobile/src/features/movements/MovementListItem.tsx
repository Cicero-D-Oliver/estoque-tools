import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TouchableRipple } from 'react-native-paper';
import type { UnifiedMovement } from './movement-ui';
import { formatLocalDateTime } from '@/features/tools/tool-ui';
import { colors, spacing } from '@/theme';

export function MovementListItem({
  movement,
  admin,
  onOpen,
  onConfirm,
}: {
  movement: UnifiedMovement;
  admin: boolean;
  onOpen: () => void;
  onConfirm: () => void;
}) {
  const pending = movement.reviewStatus === 'PENDENTE';
  return (
    <TouchableRipple onPress={onOpen} style={styles.row} accessibilityRole="button" testID={`movement-${movement.key}`}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <View style={styles.main}>
            <Text style={styles.type}>{movement.typeLabel}</Text>
            <Text style={styles.sentence}>{movement.sentence}</Text>
          </View>
          <Text style={styles.date}>{formatLocalDateTime(movement.occurredAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Por {movement.executor}</Text>
          <Text style={styles.result}>{movement.operationalResult}</Text>
        </View>
        {movement.destination ? <Text style={styles.meta}>Destino: {movement.destination}</Text> : null}
        {movement.reviewStatus ? (
          <Text style={[styles.review, pending ? styles.pending : styles.confirmed]}>
            {pending ? 'Aguardando confirmação do admin.' : 'Confirmada'}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button compact mode="text" onPress={onOpen}>Detalhes</Button>
          {admin && pending ? <Button compact mode="contained-tonal" onPress={onConfirm}>Confirmar</Button> : null}
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 },
  content: { paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.xs },
  heading: { flexDirection: 'row', gap: spacing.sm },
  main: { flex: 1 },
  type: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  sentence: { color: colors.text, fontWeight: '700', marginTop: 2 },
  date: { color: colors.textMuted, fontSize: 11 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 12 },
  result: { color: colors.text, fontSize: 12, fontWeight: '600' },
  review: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  pending: { color: colors.warning },
  confirmed: { color: colors.success },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
