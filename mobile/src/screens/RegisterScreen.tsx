import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { authService } from '@/services/auth-service';
import { shortErrorMessage } from '@/utils/errors';
import { colors, spacing } from '@/theme';

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;
type FieldErrors = Partial<Record<'nome' | 'email' | 'senha', string>>;

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.nome = 'Informe seu nome.';
    else if (name.trim().length > 120) nextErrors.nome = 'Use no máximo 120 caracteres.';

    if (!email.trim()) nextErrors.email = 'Informe seu e-mail.';
    else if (email.trim().length > 254 || !EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.';
    }

    if (password.length < 12 || password.length > 72) {
      nextErrors.senha = 'Use entre 12 e 72 caracteres.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    Keyboard.dismiss();
    setRequestError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await authService.register({
        nome: name.trim(),
        email: email.trim().toLowerCase(),
        senha: password,
      });
      navigation.popTo('Login', { notice: 'Conta criada. Entre para continuar.' });
    } catch (error) {
      setRequestError(shortErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.background}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Button
            mode="text"
            icon="arrow-left"
            compact
            style={styles.backButton}
            contentStyle={styles.backButtonContent}
            onPress={() => navigation.goBack()}
            disabled={submitting}
            accessibilityLabel="Voltar para o login"
          >
            Voltar
          </Button>

          <Text variant="headlineSmall" style={styles.title}>Criar conta</Text>

          {requestError ? (
            <View style={styles.error} accessibilityRole="alert">
              <Text style={styles.errorText}>{requestError}</Text>
            </View>
          ) : null}

          <TextInput
            label="Nome completo"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setErrors((current) => ({ ...current, nome: undefined }));
              setRequestError(null);
            }}
            mode="outlined"
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            maxLength={120}
            editable={!submitting}
            error={Boolean(errors.nome)}
            testID="register-name"
          />
          <HelperText type="error" visible={Boolean(errors.nome)}>{errors.nome}</HelperText>

          <TextInput
            label="E-mail"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setErrors((current) => ({ ...current, email: undefined }));
              setRequestError(null);
            }}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            maxLength={254}
            editable={!submitting}
            error={Boolean(errors.email)}
            testID="register-email"
          />
          <HelperText type="error" visible={Boolean(errors.email)}>{errors.email}</HelperText>

          <TextInput
            label="Senha"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrors((current) => ({ ...current, senha: undefined }));
              setRequestError(null);
            }}
            mode="outlined"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            maxLength={72}
            editable={!submitting}
            error={Boolean(errors.senha)}
            onSubmitEditing={() => void submit()}
            right={(
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((current) => !current)}
              />
            )}
            testID="register-password"
          />
          <HelperText type={errors.senha ? 'error' : 'info'} visible>
            {errors.senha ?? '12 a 72 caracteres'}
          </HelperText>

          <Button
            mode="contained"
            contentStyle={styles.buttonContent}
            loading={submitting}
            disabled={submitting}
            onPress={() => void submit()}
            testID="register-submit"
          >
            Criar conta
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.primaryDark },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  form: { backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.xs, borderRadius: 12 },
  backButton: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
  backButtonContent: { minHeight: 44 },
  title: { color: colors.text, fontWeight: '700', marginBottom: spacing.sm },
  error: {
    backgroundColor: colors.dangerSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: 10,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.danger },
  buttonContent: { minHeight: 50 },
});
