import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { colors, spacing } from '@/theme';

export function SplashScreen() {
  return (
    <View style={styles.screen} accessibilityLabel="Carregando Estoque Tools">
      <Image
        accessibilityIgnoresInvertColors
        source={require('../../assets/splash-icon.png')}
        style={styles.mark}
      />
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
    width: 88,
    height: 88,
  },
  loading: { marginTop: spacing.md },
});
