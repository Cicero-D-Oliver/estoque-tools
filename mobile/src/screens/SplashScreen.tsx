import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { colors, spacing } from '@/theme';

export function SplashScreen() {
  return (
    <View style={styles.screen} accessibilityLabel="Carregando Estoque Tools">
      <View style={styles.mark}><Text style={styles.markText}>ET</Text></View>
      <Text variant="headlineMedium" style={styles.title}>ESTOQUE TOOLS</Text>
      <ActivityIndicator color="#FFFFFF" style={styles.loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    gap: spacing.md,
  },
  mark: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  markText: { color: '#FFFFFF', fontWeight: '800', fontSize: 22 },
  title: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1 },
  loading: { marginTop: spacing.md },
});
