import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const colors = {
  primary: '#1559A6',
  primaryDark: '#0B2F57',
  primarySoft: '#E9F2FC',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#17212B',
  textMuted: '#64748B',
  border: '#DCE3EA',
  success: '#277A47',
  successSoft: '#EAF7EF',
  warning: '#9A5B00',
  warningSoft: '#FFF5DF',
  danger: '#B42318',
  dangerSoft: '#FDECEC',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const theme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 8,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primarySoft,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.text,
    error: colors.danger,
    errorContainer: colors.dangerSoft,
    outline: colors.border,
  },
};
