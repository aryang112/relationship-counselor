/**
 * Relate App — Root Entry Point
 *
 * Loads fonts (Cormorant Garamond display + DM Sans body),
 * sets up navigation, React Query, and global toast overlay.
 *
 * Font stack (per RelateApp_DesignSpec.md §2.2):
 *   - Cormorant Garamond 500/600 + italic variants → Display/heading text
 *   - DM Sans 400/600 → Body text, labels, buttons
 */

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import * as Linking from 'expo-linking';
import { RootNavigator, navTheme } from './src/navigation/RootNavigator';
import { ToastOverlay } from './src/components/feedback/ToastOverlay';

const linking: Parameters<typeof NavigationContainer>[0]['linking'] = {
  prefixes: [Linking.createURL('/'), 'relationcounselor://'],
  config: {
    screens: {
      AcceptInvite: 'invite/:token',
    },
  } as any,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    DMSans_400Regular,
    DMSans_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer theme={navTheme} linking={linking}>
            <StatusBar style="dark" />
            <RootNavigator />
            <ToastOverlay />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
