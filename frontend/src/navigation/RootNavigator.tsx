/**
 * RootNavigator — Top-level navigation controller.
 *
 * Determines which navigator to show based on authentication state:
 *   1. Auth → WelcomeScreen / Login / Register / ForgotPassword
 *   2. Onboarding → Splash → Promise → ... → Connected → Main
 *   3. Main → Bottom tabs + stack screens
 *
 * Also registers the push notification token when the user is authenticated.
 *
 * Navigation theme: Warm light theme with orangeMid as primary accent.
 */

import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { registerPushToken } from '../services/notifications';
import { LoadingScreen } from '../components/feedback/LoadingScreen';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { colors } from '../theme/colors';
import { DefaultTheme } from '@react-navigation/native';

export type RootNavigatorParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootNavigatorParamList>();

/**
 * React Navigation theme for the warm-light design system.
 * Applied via NavigationContainer (see App.tsx).
 */
export const navTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.orangeMid,
    background: colors.bgPrimary,
    card: colors.bgElevated,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.orangeMid,
  },
};

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { expoPushToken } = useNotifications();
  const onboardingDone = useAuthStore((s) => s.onboardingDone);

  useEffect(() => {
    if (!expoPushToken || !isAuthenticated) {
      return;
    }

    registerPushToken(expoPushToken).catch(() => {
      // Intentionally no-op if endpoint is unavailable.
    });
  }, [expoPushToken, isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  const needsOnboarding = isAuthenticated && !onboardingDone;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth">
          {() => <AuthNavigator onAuthSuccess={() => {}} />}
        </Stack.Screen>
      ) : needsOnboarding ? (
        <Stack.Screen name="Onboarding">
          {() => <OnboardingNavigator onComplete={() => {}} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}
