import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import type { OrganizationMember } from '@/types/api';
import type { TeamAction } from '@/services/team-service';
import { memberStatusLabels, profileLabels } from './team-ui';
import { colors, spacing } from '@/theme';

export function TeamMemberItem({
  member,
  currentAccountId,
  protectedAdmin,
  onAction,
}: {
  member: OrganizationMember;
  currentAccountId?: number;
  protectedAdmin: boolean;
  onAction: (action: TeamAction) => void;
}) {
  return (
    <View style={styles.row} testID={`team-member-${member.id}`}>
      <View style={styles.heading}>
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{member.usuarioNome}</Text>
            {member.usuarioId === currentAccountId ? <Text style={styles.you}>Você</Text> : null}
          </View>
          <Text style={styles.email} numberOfLines={1}>{member.usuarioEmail}</Text>
        </View>
        <Text style={styles.status}>{memberStatusLabels[member.status]}</Text>
      </View>
      <Text style={styles.profile}>{profileLabels[member.perfil]}</Text>
      {member.status === 'PENDENTE' ? (
        <Button mode="contained-tonal" compact onPress={() => onAction('approve')}>Aprovar</Button>
      ) : member.status === 'ATIVO' && !protectedAdmin ? (
        <View style={styles.actions}>
          <Button mode="outlined" compact onPress={() => onAction('profile')}>Alterar perfil</Button>
          <Button mode="text" compact textColor={colors.danger} onPress={() => onAction('remove')}>Remover</Button>
        </View>
      ) : protectedAdmin ? <Text style={styles.protected}>Último administrador</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 12, gap: spacing.sm },
  heading: { flexDirection: 'row', gap: spacing.sm },
  identity: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontWeight: '700' },
  you: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  status: { color: colors.textMuted, fontSize: 12 },
  profile: { color: colors.text, fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  protected: { color: colors.textMuted, fontSize: 12 },
});
