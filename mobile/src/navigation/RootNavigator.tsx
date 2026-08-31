import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { SplashScreen } from '@/screens/SplashScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { OrganizationsScreen } from '@/screens/OrganizationsScreen';
import { MainNavigator } from './MainNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function resolveRootRoute(
  status: 'restoring' | 'authenticated' | 'anonymous',
  organizationLoading: boolean,
  hasActiveOrganization: boolean,
): keyof RootStackParamList {
  if (status === 'restoring' || (status === 'authenticated' && organizationLoading)) return 'Splash';
  if (status === 'anonymous') return 'Login';
  return hasActiveOrganization ? 'Main' : 'Organizations';
}

export function RootNavigator() {
  const { status } = useAuth();
  const { activeOrganization, isLoading } = useOrganization();

  const route = resolveRootRoute(status, isLoading, Boolean(activeOrganization));

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {route === 'Splash' ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : route === 'Login' ? (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : route === 'Main' ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Organizations" component={OrganizationsScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
