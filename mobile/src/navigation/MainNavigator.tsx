import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ToolNavigator } from './ToolNavigator';
import { colors } from '@/theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { minHeight: 62, paddingBottom: 6, paddingTop: 4 },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size, focused }) => {
          const icon = route.name === 'Home'
            ? (focused ? 'home-variant' : 'home-variant-outline')
            : route.name === 'Tools'
              ? (focused ? 'hammer-wrench' : 'hammer-wrench')
              : (focused ? 'account-circle' : 'account-circle-outline');
          return <MaterialCommunityIcons name={icon} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: 'Estoque Tools', tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolNavigator}
        options={{ headerShown: false, tabBarLabel: 'Ferramentas' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil', tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}
