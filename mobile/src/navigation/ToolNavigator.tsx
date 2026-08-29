import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ToolsScreen } from '@/screens/ToolsScreen';
import { ToolDetailsScreen } from '@/screens/ToolDetailsScreen';
import { colors } from '@/theme';
import type { ToolStackParamList } from './types';

const Stack = createNativeStackNavigator<ToolStackParamList>();

export function ToolNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="ToolList" component={ToolsScreen} options={{ title: 'Ferramentas' }} />
      <Stack.Screen name="ToolDetails" component={ToolDetailsScreen} options={{ title: 'Detalhes' }} />
    </Stack.Navigator>
  );
}
