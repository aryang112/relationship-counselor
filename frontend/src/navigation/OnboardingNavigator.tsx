/**
 * OnboardingNavigator — Guides new users through the full onboarding flow.
 *
 * De-escalation-focused flow (5 quiz screens, all selection-based, before signup):
 *   Splash -> Promise -> YourName -> CommunicationStyle -> ConflictFeelings
 *   -> PartnerDetails -> ConflictPreferences -> [CreateAccount] -> Consent
 *   -> InvitePartner -> WaitingForPartner -> Connected -> Agreement -> Tutorial -> (MainApp)
 *
 * Every quiz question maps to a specific de-escalation strategy the AI can use:
 *   - Communication style → conflict role (pursuer/withdrawer)
 *   - Conflict feelings → triggers & raw spots
 *   - Partner details → partner's patterns + where they met
 *   - Conflict preferences → resolution speed, attachment, Horsemen patterns
 *
 * CreateAccount is skipped if the user is already authenticated (e.g., User B via invite).
 * Consent requires auth (JWT) so it comes after CreateAccount.
 *
 * Each screen receives navigation callbacks (onNext, onBack) and a progress
 * value (0-1) for the thin orange progress bar. Progress starts at ~15%
 * (endowed progress effect) to boost completion rates.
 *
 * On completion, sets onboardingDone in the auth store and persists
 * the flag via expo-secure-store.
 */

import React from 'react';
import { Share } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { updateProfile, submitCoupleOnboarding, acceptInvite } from '../services/auth';
import { setStoredUser } from '../services/api';
import * as SecureStore from 'expo-secure-store';

// ── Import all onboarding screens ───────────────────────────────────
import { SplashScreen } from '../screens/onboarding/SplashScreen';
import { PromiseScreen } from '../screens/onboarding/PromiseScreen';
import { YourNameScreen } from '../screens/onboarding/YourNameScreen';
import { CommunicationStyleScreen } from '../screens/onboarding/CommunicationStyleScreen';
import { ConflictFeelingsScreen } from '../screens/onboarding/ConflictFeelingsScreen';
import { PartnerDetailsScreen } from '../screens/onboarding/PartnerDetailsScreen';
import { ConflictPreferencesScreen } from '../screens/onboarding/ConflictPreferencesScreen';
import { ConsentScreen } from '../screens/onboarding/ConsentScreen';
import { InvitePartnerScreen } from '../screens/onboarding/InvitePartnerScreen';
import { AcceptInviteScreen } from '../screens/onboarding/AcceptInviteScreen';
import { WaitingForPartnerScreen } from '../screens/onboarding/WaitingForPartnerScreen';
import { ConnectedScreen } from '../screens/onboarding/ConnectedScreen';
import { AgreementScreen } from '../screens/onboarding/AgreementScreen';
import { NotificationPermissionScreen } from '../screens/onboarding/NotificationPermissionScreen';
import { TutorialScreen } from '../screens/onboarding/TutorialScreen';

// ── Import auth screens for inline CreateAccount / Login ─────────────
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';

const ONBOARDING_KEY = 'onboarding_done';

// All 5 quiz screens tracked in the progress bar (before signup)
const PROGRESS_SCREENS = [
  'YourName',
  'CommunicationStyle',
  'ConflictFeelings',
  'PartnerDetails',
  'ConflictPreferences',
] as const;

function getProgress(screenName: string): number {
  const index = PROGRESS_SCREENS.indexOf(screenName as any);
  if (index === -1) return 0;
  // Start at 15% to leverage the endowed progress effect
  return 0.15 + ((index + 1) / (PROGRESS_SCREENS.length + 1)) * 0.85;
}

// ── Type Definitions ────────────────────────────────────────────────

export type OnboardingStackParamList = {
  Splash: undefined;
  Promise: undefined;
  YourName: undefined;
  CommunicationStyle: undefined;
  ConflictFeelings: undefined;
  PartnerDetails: undefined;
  ConflictPreferences: undefined;
  CreateAccount: undefined;
  Login: undefined;
  Consent: undefined;
  InvitePartner: undefined;
  AcceptInvite: { token?: string; fromInvitePartner?: boolean } | undefined;
  WaitingForPartner: undefined;
  Connected: undefined;
  Agreement: undefined;
  NotificationPermission: undefined;
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

    // Submit couple onboarding data (all quiz answers for AI analysis)
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
            onContinue={() => navigation.navigate('YourName')}
          />
        )}
      </Stack.Screen>

      {/* Screen 3: Your Name + Gender (before auth — data stored locally) */}
      <Stack.Screen name="YourName">
        {({ navigation }) => (
          <YourNameScreen
            onNext={() => navigation.navigate('CommunicationStyle')}
            progress={getProgress('YourName')}
          />
        )}
      </Stack.Screen>

      {/* Screen 4: Communication Style — maps conflict role (pursuer/withdrawer) */}
      <Stack.Screen name="CommunicationStyle">
        {({ navigation }) => (
          <CommunicationStyleScreen
            onNext={() => navigation.navigate('ConflictFeelings')}
            onBack={() => navigation.goBack()}
            progress={getProgress('CommunicationStyle')}
          />
        )}
      </Stack.Screen>

      {/* Screen 5: Conflict Feelings — maps triggers & raw spots */}
      <Stack.Screen name="ConflictFeelings">
        {({ navigation }) => (
          <ConflictFeelingsScreen
            onNext={() => navigation.navigate('PartnerDetails')}
            onBack={() => navigation.goBack()}
            progress={getProgress('ConflictFeelings')}
          />
        )}
      </Stack.Screen>

      {/* Screen 6: Partner Details — name, gender, their patterns, where you met */}
      <Stack.Screen name="PartnerDetails">
        {({ navigation }) => (
          <PartnerDetailsScreen
            onNext={() => navigation.navigate('ConflictPreferences')}
            onBack={() => navigation.goBack()}
            progress={getProgress('PartnerDetails')}
          />
        )}
      </Stack.Screen>

      {/* Screen 7: Conflict Preferences — resolution speed, attachment, Horsemen */}
      <Stack.Screen name="ConflictPreferences">
        {({ navigation }) => (
          <ConflictPreferencesScreen
            onNext={() => {
              const isAuth = useAuthStore.getState().isAuthenticated;
              if (isAuth) {
                // Already authenticated (e.g., User B via invite) — skip CreateAccount
                navigation.navigate('Consent');
              } else {
                navigation.navigate('CreateAccount');
              }
            }}
            onBack={() => navigation.goBack()}
            progress={getProgress('ConflictPreferences')}
          />
        )}
      </Stack.Screen>

      {/* Screen 8: Create Account (inline auth — before Consent which needs JWT) */}
      <Stack.Screen name="CreateAccount">
        {({ navigation }) => (
          <RegisterScreen
            onNavigateLogin={() => navigation.navigate('Login')}
            onSuccess={() => navigation.navigate('Consent')}
          />
        )}
      </Stack.Screen>

      {/* Screen 8b: Login (for returning users who already have an account) */}
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onNavigateRegister={() => navigation.navigate('CreateAccount')}
            onNavigateForgot={() => {}} // no-op for now
            onSuccess={() => navigation.navigate('Consent')}
          />
        )}
      </Stack.Screen>

      {/* Screen 9: Legal Consent (requires JWT — must come after auth) */}
      <Stack.Screen name="Consent">
        {({ navigation }) => (
          <ConsentScreen
            onContinue={async () => {
              // Check if Partner B has a pending invite token from before registration
              const pendingToken = useOnboardingStore.getState().pendingInviteToken;
              if (pendingToken) {
                try {
                  const coupleData = await acceptInvite({ inviteToken: pendingToken });
                  useAuthStore.getState().setCouple(coupleData);
                  useOnboardingStore.getState().setPendingInviteToken(null);
                  // Couple is now formed — go to Connected
                  navigation.navigate('Connected');
                  return;
                } catch (e) {
                  console.log('[ONBOARDING] Failed to accept pending invite:', e);
                  // Clear the invalid token and fall through to normal flow
                  useOnboardingStore.getState().setPendingInviteToken(null);
                }
              }

              const couple = useAuthStore.getState().couple;
              // User B already has a couple — skip InvitePartner, go to Connected
              if (couple?.userBId) {
                navigation.navigate('Connected');
              } else {
                navigation.navigate('InvitePartner');
              }
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      {/* Screen 10: Invite Partner */}
      <Stack.Screen name="InvitePartner">
        {({ navigation }) => (
          <InvitePartnerScreen
            onPartnerJoined={() => navigation.replace('Connected')}
            onGoToAccept={() => navigation.navigate('AcceptInvite', { fromInvitePartner: true })}
            onSkip={() => navigation.replace('WaitingForPartner')}
          />
        )}
      </Stack.Screen>

      {/* Accept Invite (from Splash "I have a code" or from InvitePartner) */}
      <Stack.Screen name="AcceptInvite">
        {({ navigation, route }) => (
          <AcceptInviteScreen
            prefillToken={route.params?.token}
            onSuccess={() => {
              if (route.params?.fromInvitePartner) {
                // User already completed onboarding questions — go straight to Connected
                navigation.replace('Connected');
              } else {
                // New user (from Splash "I have a code") — start onboarding
                navigation.replace('YourName');
              }
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      {/* Screen 11: Waiting for Partner */}
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

      {/* Screen 12: Connected Celebration */}
      <Stack.Screen name="Connected">
        {({ navigation }) => (
          <ConnectedScreen
            onBegin={() => navigation.replace('Agreement')}
          />
        )}
      </Stack.Screen>

      {/* Screen 13: Mutual Agreement (both partners must sign before sessions) */}
      <Stack.Screen name="Agreement">
        {({ navigation }) => (
          <AgreementScreen
            onComplete={() => navigation.navigate('NotificationPermission')}
          />
        )}
      </Stack.Screen>

      {/* Screen 14: Notification Permission (after Agreement, before finishing) */}
      <Stack.Screen name="NotificationPermission">
        {() => (
          <NotificationPermissionScreen onNext={finishOnboarding} />
        )}
      </Stack.Screen>

      {/* Tutorial — disabled per UX review, keeping screen for future use */}
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
