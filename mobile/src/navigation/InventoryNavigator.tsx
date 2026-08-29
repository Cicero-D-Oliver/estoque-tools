import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { InventoryDetailsScreen } from '@/screens/InventoryDetailsScreen';
import type { InventoryStackParamList } from './types';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export function InventoryNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primaryDark }, headerTintColor: '#FFFFFF', headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="InventoryList" component={InventoryScreen} options={{ title: 'Estoque' }} />
      <Stack.Screen name="InventoryDetails" component={InventoryDetailsScreen} options={{ title: 'Detalhes' }} />
    </Stack.Navigator>
  );
}
