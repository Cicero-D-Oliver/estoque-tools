import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { shortErrorMessage } from '@/utils/errors';
import { colors, spacing } from '@/theme';

export function OrganizationsScreen() {
  const { account, logout } = useAuth();
  const {
    organizations,
    selectOrganization,
    createOrganization,
    error: loadError,
    refreshOrganizations,
  } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim()) {
      setActionError('Informe o nome do ambiente.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await createOrganization(name);
      setDialogOpen(false);
      setName('');
    } catch (error) {
      setActionError(shortErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const activeOrganizations = organizations.filter(
    (organization) => organization.ativa && organization.status === 'ATIVO',
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={styles.title}>Ambientes</Text>
          <Text style={styles.account}>{account?.email}</Text>
        </View>
        <Button compact onPress={() => void logout()}>Sair</Button>
      </View>

      {loadError ? (
        <View style={styles.notice}>
          <Text>Não foi possível carregar os ambientes.</Text>
          <Button onPress={() => void refreshOrganizations()}>Tentar novamente</Button>
        </View>
      ) : null}

      <FlatList
        data={activeOrganizations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Você ainda não participa de um ambiente.</Text>}
        renderItem={({ item }) => (
          <TouchableRipple
            onPress={() => void selectOrganization(item)}
            style={styles.row}
            accessibilityRole="button"
          >
            <View style={styles.rowContent}>
              <View>
                <Text variant="titleMedium" style={styles.organizationName}>{item.nome}</Text>
                <Text style={styles.profile}>{item.perfil}</Text>
              </View>
              <Text style={styles.enter}>Entrar</Text>
            </View>
          </TouchableRipple>
        )}
      />

      <Button
        mode="contained"
        icon="plus"
        contentStyle={styles.buttonContent}
        onPress={() => setDialogOpen(true)}
      >
        Novo ambiente
      </Button>

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>Novo ambiente</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nome"
              value={name}
              onChangeText={(value) => { setName(value); setActionError(null); }}
              mode="outlined"
              maxLength={120}
              autoFocus
            />
            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Cancelar</Button>
            <Button loading={saving} disabled={saving} onPress={() => void create()}>Criar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontWeight: '800' },
  account: { color: colors.textMuted, marginTop: spacing.xs },
  list: { flexGrow: 1, paddingVertical: spacing.lg, gap: spacing.sm },
  row: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowContent: { padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  organizationName: { color: colors.text, fontWeight: '700' },
  profile: { color: colors.textMuted, marginTop: spacing.xs },
  enter: { color: colors.primary, fontWeight: '700' },
  empty: { color: colors.textMuted, paddingVertical: spacing.xl, textAlign: 'center' },
  notice: { backgroundColor: colors.warningSoft, padding: spacing.md, marginTop: spacing.md },
  buttonContent: { minHeight: 50 },
  error: { color: colors.danger, marginTop: spacing.sm },
});
