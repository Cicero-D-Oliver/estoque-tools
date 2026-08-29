import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, RadioButton, Text } from 'react-native-paper';
import type { MemberProfile, OrganizationMember } from '@/types/api';
import type { TeamAction } from '@/services/team-service';
import { profileLabels } from './team-ui';
import { colors, spacing } from '@/theme';

export const teamActionTitles: Record<TeamAction, string> = {
  approve: 'Aprovar acesso',
  profile: 'Alterar perfil',
  remove: 'Remover acesso',
};

export function teamActionProfiles(action: TeamAction): MemberProfile[] {
  return action === 'approve' ? ['OPERADOR', 'CONSULTA'] : ['ADMIN', 'OPERADOR', 'CONSULTA'];
}

export function TeamActionDialog({
  action,
  member,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  action: TeamAction | null;
  member: OrganizationMember | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (profile?: MemberProfile) => void;
}) {
  const [profile, setProfile] = useState<MemberProfile>('OPERADOR');
  useEffect(() => {
    setProfile(action === 'profile' && member ? member.perfil : 'OPERADOR');
  }, [action, member]);
  if (!action) return null;
  return (
    <Portal>
      <Dialog visible dismissable={!pending} onDismiss={onClose}>
        <Dialog.Title>{teamActionTitles[action]}</Dialog.Title>
        <Dialog.Content>
          {member ? (
            <View style={styles.identity}>
              {action === 'remove' ? <Text style={styles.name}>{member.usuarioNome}</Text> : null}
              <Text style={styles.email}>{member.usuarioEmail}</Text>
            </View>
          ) : null}
          {action !== 'remove' ? (
            <View style={styles.group}>
              <Text style={styles.label}>Perfil</Text>
              <RadioButton.Group value={profile} onValueChange={(value) => setProfile(value as MemberProfile)}>
                {teamActionProfiles(action).map((allowedProfile) => (
                  <RadioButton.Item
                    key={allowedProfile}
                    label={profileLabels[allowedProfile]}
                    value={allowedProfile}
                    style={styles.radio}
                  />
                ))}
              </RadioButton.Group>
            </View>
          ) : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={pending}>Cancelar</Button>
          <Button
            mode="contained"
            onPress={() => onSubmit(action === 'remove' ? undefined : profile)}
            loading={pending}
            disabled={pending}
            buttonColor={action === 'remove' ? colors.danger : undefined}
            textColor={action === 'remove' ? '#FFFFFF' : undefined}
          >
            {action === 'approve' ? 'Aprovar' : action === 'profile' ? 'Salvar' : 'Remover acesso'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  identity: { marginBottom: spacing.md },
  name: { color: colors.text, fontWeight: '700' },
  email: { color: colors.textMuted, marginTop: 2 },
  group: { gap: spacing.xs },
  label: { color: colors.text, fontWeight: '700' },
  radio: { minHeight: 48, paddingHorizontal: 0 },
  error: { color: colors.danger, backgroundColor: colors.dangerSoft, borderLeftColor: colors.danger, borderLeftWidth: 3, padding: spacing.sm, marginTop: spacing.md },
});
