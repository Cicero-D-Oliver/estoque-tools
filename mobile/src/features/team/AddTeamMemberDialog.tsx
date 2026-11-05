import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, RadioButton, Text, TextInput } from 'react-native-paper';
import type { MemberProfile } from '@/types/api';
import { colors, spacing } from '@/theme';

const CORPORATE_DOMAIN = 'scaladatacenters.com';
type OperationalProfile = Exclude<MemberProfile, 'ADMIN'>;

export function AddTeamMemberDialog({
  visible,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (email: string, profile: OperationalProfile) => void;
}) {
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<OperationalProfile>('OPERADOR');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEmail('');
    setProfile('OPERADOR');
    setValidationError(null);
  }, [visible]);

  const submit = () => {
    const normalized = email.trim().toLowerCase();
    const domain = normalized.slice(normalized.lastIndexOf('@') + 1);
    if (!/^\S+@\S+\.\S+$/.test(normalized) || domain !== CORPORATE_DOMAIN) {
      setValidationError(`Use o e-mail corporativo @${CORPORATE_DOMAIN}.`);
      return;
    }
    setValidationError(null);
    onSubmit(normalized, profile);
  };

  return (
    <Portal>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
        <Dialog visible={visible} dismissable={!pending} onDismiss={onClose}>
          <Dialog.Title>Convidar pessoa</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="E-mail corporativo"
              value={email}
              onChangeText={(value) => { setEmail(value); setValidationError(null); }}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!pending}
              testID="add-member-email"
            />
            <HelperText type={validationError ? 'error' : 'info'} visible>
              {validationError ?? `Use um endereço @${CORPORATE_DOMAIN}.`}
            </HelperText>
            <View style={styles.group}>
              <Text style={styles.label}>Perfil</Text>
              <RadioButton.Group value={profile} onValueChange={(value) => setProfile(value as OperationalProfile)}>
                <RadioButton.Item label="Operador" value="OPERADOR" style={styles.radio} />
                <RadioButton.Item label="Consulta" value="CONSULTA" style={styles.radio} testID="add-member-profile-consulta" />
              </RadioButton.Group>
            </View>
            {error ? <View style={styles.error} accessibilityRole="alert"><Text style={styles.errorText}>{error}</Text></View> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={onClose} disabled={pending}>Cancelar</Button>
            <Button mode="contained" onPress={submit} loading={pending} disabled={pending}>Enviar convite</Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
    </Portal>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, justifyContent: 'center' },
  group: { gap: spacing.xs },
  label: { color: colors.text, fontWeight: '700' },
  radio: { minHeight: 48, paddingHorizontal: 0 },
  error: { gap: spacing.xs, marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.dangerSoft, borderLeftColor: colors.danger, borderLeftWidth: 3 },
  errorText: { color: colors.danger },
});
