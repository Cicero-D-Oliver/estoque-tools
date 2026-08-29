import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { MovementsScreen } from '@/screens/MovementsScreen';
import { TeamScreen } from '@/screens/TeamScreen';
import { useOrganization } from '@/providers/OrganizationProvider';
import { canAccessTeam } from '@/features/team/team-ui';
import { ToolNavigator } from './ToolNavigator';
import { InventoryNavigator } from './InventoryNavigator';
import { colors } from '@/theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  const { activeOrganization } = useOrganization();
  const admin = canAccessTeam(activeOrganization?.perfil ?? 'CONSULTA');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { minHeight: 62, paddingBottom: 6, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 10 },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size, focused }) => {
          const icon = route.name === 'Home'
            ? (focused ? 'home-variant' : 'home-variant-outline')
            : route.name === 'Tools'
              ? (focused ? 'hammer-wrench' : 'hammer-wrench')
              : route.name === 'Inventory'
                ? (focused ? 'package-variant-closed' : 'package-variant')
                : route.name === 'Movements'
                  ? (focused ? 'swap-horizontal-bold' : 'swap-horizontal')
                  : route.name === 'Team'
                    ? (focused ? 'account-group' : 'account-group-outline')
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
        name="Inventory"
        component={InventoryNavigator}
        options={{ headerShown: false, tabBarLabel: 'Estoque' }}
      />
      <Tab.Screen
        name="Movements"
        component={MovementsScreen}
        options={{ title: 'Movimentações', tabBarLabel: 'Movimentos' }}
      />
      {admin ? (
        <Tab.Screen
          name="Team"
          component={TeamScreen}
          options={{ title: 'Equipe', tabBarLabel: 'Equipe' }}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil', tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}
