/**
 * OnboardingNavigator — Guides new users through the full onboarding flow.
 *
 * Flow order (per RelateApp_DesignSpec.md S3):
 *   Splash -> Promise -> YourName -> CommunicationStyle -> ConflictFeelings
 *   -> RelationshipStory -> PartnerDetails -> LoveBank -> ConflictPreferences
 *   -> InvitePartner -> WaitingForPartner -> Connected -> Tutorial -> (MainApp)
 *
 * Each screen receives navigation callbacks (onNext, onBack) and a progress
 * value (0-1) for the thin orange progress bar.
 *
 * On completion, sets onboardingDone in the auth store and persists
 * the flag via expo-secure-store.
 */

import React from 'react';
import { Share } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import * as SecureStore from 'expo-secure-store';

// ── Import all onboarding screens ───────────────────────────────────
import { SplashScreen } from '../screens/onboarding/SplashScreen';
import { PromiseScreen } from '../screens/onboarding/PromiseScreen';
import { YourNameScreen } from '../screens/onboarding/YourNameScreen';
import { CommunicationStyleScreen } from '../screens/onboarding/CommunicationStyleScreen';
import { ConflictFeelingsScreen } from '../screens/onboarding/ConflictFeelingsScreen';
import { RelationshipStoryScreen } from '../screens/onboarding/RelationshipStoryScreen';
import { PartnerDetailsScreen } from '../screens/onboarding/PartnerDetailsScreen';
import { LoveBankScreen } from '../screens/onboarding/LoveBankScreen';
import { ConflictPreferencesScreen } from '../screens/onboarding/ConflictPreferencesScreen';
import { InvitePartnerScreen } from '../screens/onboarding/InvitePartnerScreen';
import { AcceptInviteScreen } from '../screens/onboarding/AcceptInviteScreen';
import { WaitingForPartnerScreen } from '../screens/onboarding/WaitingForPartnerScreen';
import { ConnectedScreen } from '../screens/onboarding/ConnectedScreen';
import { TutorialScreen } from '../screens/onboarding/TutorialScreen';

const ONBOARDING_KEY = 'onboarding_done';

// Total number of progress-tracked screens (YourName through ConflictPreferences)
const PROGRESS_SCREENS = [
  'YourName',
  'CommunicationStyle',
  'ConflictFeelings',
  'RelationshipStory',
  'PartnerDetails',
  'LoveBank',
  'ConflictPreferences',
] as const;

function getProgress(screenName: string): number {
  const index = PROGRESS_SCREENS.indexOf(screenName as any);
  if (index === -1) return 0;
  return (index + 1) / (PROGRESS_SCREENS.length + 1);
}

// ── Type Definitions ────────────────────────────────────────────────

export type OnboardingStackParamList = {
  Splash: undefined;
  Promise: undefined;
  YourName: undefined;
  CommunicationStyle: undefined;
  ConflictFeelings: undefined;
  RelationshipStory: undefined;
  PartnerDetails: undefined;
  LoveBank: undefined;
  ConflictPreferences: undefined;
  InvitePartner: undefined;
  AcceptInvite: { token?: string } | undefined;
  WaitingForPartner: undefined;
  Connected: undefined;
  Tutorial: undefined;
  // Legacy alias
  CoupleSetup: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// ── Navigator ───────────────────────────────────────────────────────

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  const couple = useAuthStore((s) => s.couple);
  const hasCoupleFormed = couple && couple.userBId;

  const finishOnboarding = () => {
    SecureStore.setItemAsync(ONBOARDING_KEY, 'true').catch(() => {});
    useAuthStore.getState().setOnboardingDone(true);
    onComplete();
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
      }}
      initialRouteName={hasCoupleFormed ? 'Tutorial' : 'Splash'}
    >
      {/* Screen 1: Splash */}
      <Stack.Screen name="Splash">
        {({ navigation }) => (
          <SplashScreen
            onGetStarted={() => navigation.navigate('Promise')}
            onHaveCode={() => navigation.navigate('AcceptInvite')}
          />
        )}
      </Stack.Screen>

      {/* Screen 2: Promise */}
      <Stack.Screen name="Promise">
        {({ navigation }) => (
          <PromiseScreen
            onContinue={() => navigation.navigate('YourName')}
          />
        )}
      </Stack.Screen>

      {/* Screen 3: Your Name */}
      <Stack.Screen name="YourName">
        {({ navigation }) => (
          <YourNameScreen
            onNext={() => navigation.navigate('CommunicationStyle')}
            progress={getProgress('YourName')}
          />
        )}
      </Stack.Screen>

      {/* Screen 4a: Communication Style */}
      <Stack.Screen name="CommunicationStyle">
        {({ navigation }) => (
          <CommunicationStyleScreen
            onNext={() => navigation.navigate('ConflictFeelings')}
            onBack={() => navigation.goBack()}
            progress={getProgress('CommunicationStyle')}
          />
        )}
      </Stack.Screen>

      {/* Screen 4b: Conflict Feelings */}
      <Stack.Screen name="ConflictFeelings">
        {({ navigation }) => (
          <ConflictFeelingsScreen
            onNext={() => navigation.navigate('RelationshipStory')}
            onBack={() => navigation.goBack()}
            progress={getProgress('ConflictFeelings')}
          />
        )}
      </Stack.Screen>

      {/* Screens 5a-5d: Relationship Story (multi-step) */}
      <Stack.Screen name="RelationshipStory">
        {({ navigation }) => (
          <RelationshipStoryScreen
            onNext={() => navigation.navigate('PartnerDetails')}
            onBack={() => navigation.goBack()}
            progress={getProgress('RelationshipStory')}
          />
        )}
      </Stack.Screen>

      {/* Screens 6a-6c: Partner Details (multi-step) */}
      <Stack.Screen name="PartnerDetails">
        {({ navigation }) => (
          <PartnerDetailsScreen
            onNext={() => navigation.navigate('LoveBank')}
            onBack={() => navigation.goBack()}
            progress={getProgress('PartnerDetails')}
          />
        )}
      </Stack.Screen>

      {/* Screen 7: Love Bank */}
      <Stack.Screen name="LoveBank">
        {({ navigation }) => (
          <LoveBankScreen
            onNext={() => navigation.navigate('ConflictPreferences')}
            onBack={() => navigation.goBack()}
            progress={getProgress('LoveBank')}
          />
        )}
      </Stack.Screen>

      {/* Screen 8: Conflict Preferences */}
      <Stack.Screen name="ConflictPreferences">
        {({ navigation }) => (
          <ConflictPreferencesScreen
            onNext={() => navigation.navigate('InvitePartner')}
            onBack={() => navigation.goBack()}
            progress={getProgress('ConflictPreferences')}
          />
        )}
      </Stack.Screen>

      {/* Screen 9: Invite Partner */}
      <Stack.Screen name="InvitePartner">
        {({ navigation }) => (
          <InvitePartnerScreen
            onPartnerJoined={() => navigation.replace('Connected')}
            onGoToAccept={() => navigation.navigate('AcceptInvite')}
            onSkip={() => navigation.replace('WaitingForPartner')}
          />
        )}
      </Stack.Screen>

      {/* Accept Invite (from Splash "I have a code" or from InvitePartner) */}
      <Stack.Screen name="AcceptInvite">
        {({ navigation, route }) => (
          <AcceptInviteScreen
            prefillToken={route.params?.token}
            onSuccess={() => navigation.replace('Connected')}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      {/* Screen 10: Waiting for Partner */}
      <Stack.Screen name="WaitingForPartner">
        {({ navigation }) => (
          <WaitingForPartnerScreen
            onPartnerJoined={() => navigation.replace('Connected')}
            onSendReminder={async () => {
              try {
                await Share.share({
                  message:
                    "I'm waiting for you on Relate! Open the app and enter the code I sent you.",
                });
              } catch {
                // User cancelled share
              }
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      {/* Screen 11: Connected Celebration */}
      <Stack.Screen name="Connected">
        {({ navigation }) => (
          <ConnectedScreen
            onBegin={() => navigation.replace('Tutorial')}
          />
        )}
      </Stack.Screen>

      {/* Tutorial (final step before main app) */}
      <Stack.Screen name="Tutorial">
        {() => <TutorialScreen onComplete={finishOnboarding} />}
      </Stack.Screen>

      {/* Legacy alias for CoupleSetup -> InvitePartner */}
      <Stack.Screen name="CoupleSetup">
        {({ navigation }) => (
          <InvitePartnerScreen
            onPartnerJoined={() => navigation.replace('Tutorial')}
            onGoToAccept={() => navigation.navigate('AcceptInvite')}
            onSkip={() => navigation.replace('Tutorial')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
