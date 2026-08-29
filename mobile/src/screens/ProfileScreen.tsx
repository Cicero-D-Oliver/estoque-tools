import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { colors, spacing } from '@/theme';

const profileLabels = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  CONSULTA: 'Consulta',
} as const;

export function ProfileScreen() {
  const { account, logout } = useAuth();
  const { activeOrganization, leaveOrganization } = useOrganization();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.identity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{account?.nome[0]?.toUpperCase()}</Text></View>
        <Text variant="titleLarge" style={styles.name}>{account?.nome}</Text>
        <Text style={styles.email}>{account?.email}</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.label}>Ambiente</Text>
        <Text style={styles.value}>{activeOrganization?.nome}</Text>
        <Text style={styles.label}>Perfil</Text>
        <Text style={styles.value}>{activeOrganization ? profileLabels[activeOrganization.perfil] : '—'}</Text>
      </View>

      <View style={styles.actions}>
        <Button mode="outlined" contentStyle={styles.button} onPress={() => void leaveOrganization()}>
          Trocar ambiente
        </Button>
        <Button mode="contained" contentStyle={styles.button} onPress={() => setConfirmLogout(true)}>
          Sair
        </Button>
      </View>

      <Portal>
        <Dialog visible={confirmLogout} onDismiss={() => setConfirmLogout(false)}>
          <Dialog.Title>Sair?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setConfirmLogout(false)}>Cancelar</Button>
            <Button onPress={() => { setConfirmLogout(false); void logout(); }}>Sair</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  identity: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 24 },
  name: { color: colors.text, fontWeight: '800' },
  email: { color: colors.textMuted },
  details: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  value: { color: colors.text, fontWeight: '700' },
  actions: { marginTop: 'auto', gap: spacing.sm },
  button: { minHeight: 48 },
});
