/**
 * OnboardingNavigator — Guides new users through the full onboarding flow.
 *
 * Flow order (per RelateApp_DesignSpec.md S3):
 *   Splash -> Promise -> Consent -> YourName -> CommunicationStyle -> ConflictFeelings
 *   -> RelationshipStory -> PartnerDetails -> LoveBank -> ConflictPreferences
 *   -> InvitePartner -> WaitingForPartner -> Connected -> Agreement -> Tutorial -> (MainApp)
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
import { useOnboardingStore } from '../store/onboardingStore';
import { updateProfile, submitCoupleOnboarding } from '../services/auth';
import { setStoredUser } from '../services/api';
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
import { ConsentScreen } from '../screens/onboarding/ConsentScreen';
import { InvitePartnerScreen } from '../screens/onboarding/InvitePartnerScreen';
import { AcceptInviteScreen } from '../screens/onboarding/AcceptInviteScreen';
import { WaitingForPartnerScreen } from '../screens/onboarding/WaitingForPartnerScreen';
import { ConnectedScreen } from '../screens/onboarding/ConnectedScreen';
import { AgreementScreen } from '../screens/onboarding/AgreementScreen';
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
  Consent: undefined;
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
  Agreement: undefined;
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

  const finishOnboarding = async () => {
    const store = useOnboardingStore.getState();
    const authState = useAuthStore.getState();

    // Submit user profile (name + gender)
    try {
      const updated = await updateProfile({
        name: store.firstName || undefined,
        gender: store.gender || undefined,
      });
      // Update local user with the real name
      if (authState.user) {
        const updatedUser = { ...authState.user, name: updated.name };
        authState.setUser(updatedUser);
        await setStoredUser(updatedUser);
      }
    } catch (e) {
      console.log('[ONBOARDING] Failed to update profile:', e);
    }

    // Submit couple onboarding data (relationship story + all form data)
    try {
      const onboardingPayload = {
        datingStartDate: store.datingStartDate || undefined,
        data: {
          communicationStyles: store.communicationStyles,
          conflictFeelings: store.conflictFeelings,
          isLongDistance: store.isLongDistance,
          howMet: store.howMet,
          firstDateLocation: store.firstDateLocation,
          partnerName: store.partnerName,
          partnerGender: store.partnerGender,
          partnerCommunicationStyles: store.partnerCommunicationStyles,
          partnerConflictFeelings: store.partnerConflictFeelings,
          loveReasons: store.loveReasons,
          favoriteMemory: store.favoriteMemory,
          relationshipStrengths: store.relationshipStrengths,
          resolutionSpeed: store.resolutionSpeed,
          attachmentStyle: store.attachmentStyle,
          pastConflictPatterns: store.pastConflictPatterns,
        },
      };
      const updatedCouple = await submitCoupleOnboarding(onboardingPayload);
      authState.setCouple(updatedCouple);
    } catch (e) {
      console.log('[ONBOARDING] Failed to submit couple data:', e);
    }

    const userId = authState.user?.id || '';
    await SecureStore.setItemAsync(`${ONBOARDING_KEY}_${userId}`, 'true').catch(() => {});
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
            onContinue={() => navigation.navigate('Consent')}
          />
        )}
      </Stack.Screen>

      {/* Screen 2.5: Legal Consent */}
      <Stack.Screen name="Consent">
        {({ navigation }) => (
          <ConsentScreen
            onContinue={() => navigation.navigate('YourName')}
            onBack={() => navigation.goBack()}
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
            onNext={() => {
              const couple = useAuthStore.getState().couple;
              // User B skips RelationshipStory (User A already filled it)
              if (couple?.userBId) {
                navigation.navigate('PartnerDetails');
              } else {
                navigation.navigate('RelationshipStory');
              }
            }}
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
            onNext={() => {
              const couple = useAuthStore.getState().couple;
              // User B already has a couple — skip InvitePartner, go to Connected
              if (couple?.userBId) {
                navigation.navigate('Connected');
              } else {
                navigation.navigate('InvitePartner');
              }
            }}
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
            onSuccess={() => navigation.replace('YourName')}
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
            onBegin={() => navigation.replace('Agreement')}
          />
        )}
      </Stack.Screen>

      {/* Screen 12: Mutual Agreement (both partners must sign before sessions) */}
      <Stack.Screen name="Agreement">
        {({ navigation }) => (
          <AgreementScreen
            onComplete={() => navigation.replace('Tutorial')}
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
