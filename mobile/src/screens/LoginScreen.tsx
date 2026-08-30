import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useAuth } from '@/providers/AuthProvider';
import { loginErrorMessage } from '@/utils/errors';
import { colors, spacing } from '@/theme';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (requestError) {
      setError(loginErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.background}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Image
              accessibilityIgnoresInvertColors
              source={require('../../assets/splash-icon.png')}
              style={styles.markImage}
            />
          </View>
          <Text variant="headlineMedium" style={styles.brandName}>ESTOQUE TOOLS</Text>
        </View>

        <View style={styles.form}>
          <Text variant="headlineSmall" style={styles.title}>Entrar</Text>
          {error ? (
            <View style={styles.error} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TextInput
            label="E-mail"
            value={email}
            onChangeText={(value) => { setEmail(value); setError(null); }}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            editable={!submitting}
            testID="login-email"
          />
          <TextInput
            label="Senha"
            value={password}
            onChangeText={(value) => { setPassword(value); setError(null); }}
            mode="outlined"
            secureTextEntry={!showPassword}
            textContentType="password"
            editable={!submitting}
            onSubmitEditing={() => void submit()}
            right={(
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((current) => !current)}
              />
            )}
            testID="login-password"
          />
          <HelperText type="info" visible={false}>Credenciais</HelperText>
          <Button
            mode="contained"
            contentStyle={styles.buttonContent}
            loading={submitting}
            disabled={submitting}
            onPress={() => void submit()}
            testID="login-submit"
          >
            Entrar
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.primaryDark },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.md },
  mark: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markImage: { width: 54, height: 54 },
  brandName: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1 },
  form: { backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md, borderRadius: 12 },
  title: { color: colors.text, fontWeight: '700' },
  error: { backgroundColor: colors.dangerSoft, borderLeftWidth: 3, borderLeftColor: colors.danger, padding: 10 },
  errorText: { color: colors.danger },
  buttonContent: { minHeight: 50 },
});
