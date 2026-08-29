import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import type { UnifiedMovement } from './movement-ui';
import { formatLocalDateTime } from '@/features/tools/tool-ui';
import { colors, spacing } from '@/theme';

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

export function MovementDetailsDialog({
  movement,
  admin,
  onClose,
  onConfirm,
}: {
  movement: UnifiedMovement | null;
  admin: boolean;
  onClose: () => void;
  onConfirm: (movement: UnifiedMovement) => void;
}) {
  return (
    <Portal>
      <Dialog visible={Boolean(movement)} onDismiss={onClose} style={styles.dialog}>
        <Dialog.Title>{movement?.typeLabel}</Dialog.Title>
        <Dialog.Content>
          {movement ? (
            <ScrollView style={styles.scroll}>
              <Text style={styles.sentence}>{movement.sentence}</Text>
              <DetailRow label="Data e hora" value={formatLocalDateTime(movement.occurredAt)} />
              <DetailRow label={movement.source === 'tool' ? 'Ferramenta' : 'Item'} value={`${movement.subjectName}${movement.subjectCode ? ` · ${movement.subjectCode}` : ''}`} />
              <DetailRow label="Executor" value={movement.executor} />
              {movement.previousResponsible ? <DetailRow label="Responsável anterior" value={movement.previousResponsible} /> : null}
              {movement.responsible ? <DetailRow label="Novo responsável" value={movement.responsible} /> : null}
              {movement.source === 'stock' ? <DetailRow label="Quantidade" value={movement.operationalResult} /> : null}
              <DetailRow label="Destino" value={movement.destination || '—'} />
              <DetailRow label="Observação" value={movement.observation || '—'} />
              {movement.reviewStatus ? <DetailRow label="Confirmação" value={movement.reviewStatus === 'PENDENTE' ? 'Aguardando confirmação do admin.' : 'Confirmada'} /> : null}
              {movement.confirmedBy ? <DetailRow label="Confirmada por" value={movement.confirmedBy} /> : null}
              {movement.confirmedAt ? <DetailRow label="Confirmada em" value={formatLocalDateTime(movement.confirmedAt)} /> : null}
            </ScrollView>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose}>Fechar</Button>
          {movement && admin && movement.reviewStatus === 'PENDENTE' ? (
            <Button mode="contained" onPress={() => onConfirm(movement)}>Confirmar movimentação</Button>
          ) : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export function ConfirmMovementDialog({
  movement,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  movement: UnifiedMovement | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={Boolean(movement)} dismissable={!pending} onDismiss={onClose}>
        <Dialog.Title>Confirmar movimentação?</Dialog.Title>
        <Dialog.Content>
          {movement ? <View><Text variant="titleMedium" style={styles.subject}>{movement.subjectName}</Text><Text style={styles.type}>{movement.typeLabel}</Text></View> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={pending}>Não</Button>
          <Button mode="contained" onPress={onConfirm} loading={pending} disabled={pending}>Sim</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxHeight: '92%' },
  scroll: { maxHeight: 560 },
  sentence: { color: colors.text, fontWeight: '700', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { color: colors.textMuted, flex: 1 },
  value: { color: colors.text, fontWeight: '600', flex: 1.5, textAlign: 'right' },
  subject: { color: colors.text, fontWeight: '700' },
  type: { color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, borderLeftColor: colors.danger, borderLeftWidth: 3, padding: spacing.sm, marginTop: spacing.md },
});
