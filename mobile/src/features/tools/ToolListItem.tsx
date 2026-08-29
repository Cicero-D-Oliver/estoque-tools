import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TouchableRipple } from 'react-native-paper';
import type { MemberProfile, Tool } from '@/types/api';
import {
  actionLabels,
  formatLocalDateTime,
  primaryToolAction,
  toolCurrentLocation,
  toolStatusColor,
  toolStatusLabel,
} from './tool-ui';
import type { ToolAction } from '@/services/tool-service';
import { colors, spacing } from '@/theme';

interface ToolListItemProps {
  tool: Tool;
  profile: MemberProfile;
  onOpen: () => void;
  onAction: (action: ToolAction) => void;
}

export function ToolListItem({ tool, profile, onOpen, onAction }: ToolListItemProps) {
  const primary = primaryToolAction(tool, profile);
  const since = tool.status === 'EMPRESTADA' ? formatLocalDateTime(tool.responsavelDesde) : '—';

  return (
    <TouchableRipple
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Abrir detalhes de ${tool.nome}`}
      style={styles.row}
      testID={`tool-row-${tool.id}`}
    >
      <View style={styles.content}>
        <View style={styles.topLine}>
          <View style={styles.identity}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>{tool.nome}</Text>
            <Text style={styles.asset}>{tool.patrimonio}</Text>
          </View>
          <Text style={[styles.status, { color: toolStatusColor(tool) }]}>{toolStatusLabel(tool)}</Text>
        </View>

        <View style={styles.operational}>
          <View style={styles.detail}>
            <Text style={styles.label}>Responsável</Text>
            <Text style={styles.value} numberOfLines={1}>{tool.responsavelAtualNome ?? '—'}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.label}>Onde está</Text>
            <Text style={styles.value} numberOfLines={1}>{toolCurrentLocation(tool)}</Text>
          </View>
          <View style={styles.detailSmall}>
            <Text style={styles.label}>Desde</Text>
            <Text style={styles.value} numberOfLines={1}>{since}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Button compact mode="text" onPress={onOpen}>Detalhes</Button>
          {primary ? (
            <Button compact mode="contained-tonal" onPress={() => onAction(primary)}>
              {actionLabels[primary]}
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
  topLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1 },
  name: { color: colors.text, fontWeight: '700' },
  asset: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  status: { fontWeight: '700', fontSize: 12, paddingTop: 2 },
  operational: { flexDirection: 'row', gap: spacing.sm },
  detail: { flex: 1 },
  detailSmall: { width: 92 },
  label: { color: colors.textMuted, fontSize: 11 },
  value: { color: colors.text, fontSize: 13, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
