/**
 * OnboardingNavigator — Guides new users through the full onboarding flow.
 *
 * Behavioral profile flow (8 quiz screens, all single-select, before signup):
 *   Splash -> Promise -> YourName -> ConflictBehavior -> CoreEmotion
 *   -> PursueWithdraw -> FloodingThreshold -> CoreFear -> RepairStyle
 *   -> RecurringTheme -> CommunicationMedium -> [CreateAccount] -> Consent
 *   -> InvitePartner -> NotificationPermission -> Paywall -> Agreement -> (MainApp)
 *
 * Each quiz question maps to a psychological construct the AI uses silently:
 *   - Conflict behavior → Gottman Four Horsemen
 *   - Core emotion → EFT primary emotion
 *   - Pursue/withdraw → demand/withdraw cycle role
 *   - Flooding threshold → overwhelm pacing
 *   - Core fear → attachment fear (disguised)
 *   - Repair style → post-conflict reconnection
 *   - Recurring theme → perpetual conflict pattern
 *   - Communication medium → tone-reading risk
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
import { ConflictBehaviorScreen } from '../screens/onboarding/ConflictBehaviorScreen';
import { CoreEmotionScreen } from '../screens/onboarding/CoreEmotionScreen';
import { PursueWithdrawScreen } from '../screens/onboarding/PursueWithdrawScreen';
import { FloodingThresholdScreen } from '../screens/onboarding/FloodingThresholdScreen';
import { CoreFearScreen } from '../screens/onboarding/CoreFearScreen';
import { RepairStyleScreen } from '../screens/onboarding/RepairStyleScreen';
import { RecurringThemeScreen } from '../screens/onboarding/RecurringThemeScreen';
import { CommunicationMediumScreen } from '../screens/onboarding/CommunicationMediumScreen';
import { ConsentScreen } from '../screens/onboarding/ConsentScreen';
import { InvitePartnerScreen } from '../screens/onboarding/InvitePartnerScreen';
import { AcceptInviteScreen } from '../screens/onboarding/AcceptInviteScreen';
import { WaitingForPartnerScreen } from '../screens/onboarding/WaitingForPartnerScreen';
import { ConnectedScreen } from '../screens/onboarding/ConnectedScreen';
import { NotificationPermissionScreen } from '../screens/onboarding/NotificationPermissionScreen';
import { TutorialScreen } from '../screens/onboarding/TutorialScreen';

// ── Import auth screens for inline CreateAccount / Login ─────────────
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';

// ── Paywall ─────────────────────────────────────────────────────────
import { PaywallScreen } from '../screens/subscription/PaywallScreen';

const ONBOARDING_KEY = 'onboarding_done';

// All 8 quiz screens tracked in the progress bar (before signup)
const PROGRESS_SCREENS = [
  'YourName',
  'ConflictBehavior',
  'CoreEmotion',
  'PursueWithdraw',
  'FloodingThreshold',
  'CoreFear',
  'RepairStyle',
  'RecurringTheme',
  'CommunicationMedium',
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
  ConflictBehavior: undefined;
  CoreEmotion: undefined;
  PursueWithdraw: undefined;
  FloodingThreshold: undefined;
  CoreFear: undefined;
  RepairStyle: undefined;
  RecurringTheme: undefined;
  CommunicationMedium: undefined;
  CreateAccount: undefined;
  Login: undefined;
  Consent: undefined;
  InvitePartner: undefined;
  AcceptInvite: { token?: string; fromInvitePartner?: boolean } | undefined;
  WaitingForPartner: undefined;
  Connected: undefined;
  Paywall: undefined;
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

    // Submit couple onboarding data (behavioral profile for AI)
    try {
      const onboardingPayload = {
        data: {
          // New behavioral profile fields (v2)
          conflictBehavior: store.conflictBehavior,
          coreEmotion: store.coreEmotion,
          pursueWithdraw: store.pursueWithdraw,
          floodingThreshold: store.floodingThreshold,
          coreFear: store.coreFear,
          repairStyle: store.repairStyle,
          recurringTheme: store.recurringTheme,
          communicationMedium: store.communicationMedium,
          // Partner name (if entered during invite flow)
          partnerName: store.partnerName,
          partnerGender: store.partnerGender,
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
            onSignIn={() => {
              // Skip onboarding → RootNavigator shows AuthNavigator with login
              useAuthStore.getState().setOnboardingDone(true);
            }}
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

      {/* Quiz Screen 1: Your Name + Gender */}
      <Stack.Screen name="YourName">
        {({ navigation }) => (
          <YourNameScreen
            onNext={() => navigation.navigate('ConflictBehavior')}
            progress={getProgress('YourName')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 2: Conflict Behavior — Gottman Four Horsemen */}
      <Stack.Screen name="ConflictBehavior">
        {({ navigation }) => (
          <ConflictBehaviorScreen
            onNext={() => navigation.navigate('CoreEmotion')}
            onBack={() => navigation.goBack()}
            progress={getProgress('ConflictBehavior')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 3: Core Emotion — EFT primary emotion */}
      <Stack.Screen name="CoreEmotion">
        {({ navigation }) => (
          <CoreEmotionScreen
            onNext={() => navigation.navigate('PursueWithdraw')}
            onBack={() => navigation.goBack()}
            progress={getProgress('CoreEmotion')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 4: Pursue vs Withdraw — demand/withdraw cycle */}
      <Stack.Screen name="PursueWithdraw">
        {({ navigation }) => (
          <PursueWithdrawScreen
            onNext={() => navigation.navigate('FloodingThreshold')}
            onBack={() => navigation.goBack()}
            progress={getProgress('PursueWithdraw')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 5: Flooding Threshold — overwhelm speed */}
      <Stack.Screen name="FloodingThreshold">
        {({ navigation }) => (
          <FloodingThresholdScreen
            onNext={() => navigation.navigate('CoreFear')}
            onBack={() => navigation.goBack()}
            progress={getProgress('FloodingThreshold')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 6: Core Fear — attachment fear (disguised) */}
      <Stack.Screen name="CoreFear">
        {({ navigation }) => (
          <CoreFearScreen
            onNext={() => navigation.navigate('RepairStyle')}
            onBack={() => navigation.goBack()}
            progress={getProgress('CoreFear')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 7: Repair Style — post-fight reconnection */}
      <Stack.Screen name="RepairStyle">
        {({ navigation }) => (
          <RepairStyleScreen
            onNext={() => navigation.navigate('RecurringTheme')}
            onBack={() => navigation.goBack()}
            progress={getProgress('RepairStyle')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 8: Recurring Theme — perpetual conflict pattern */}
      <Stack.Screen name="RecurringTheme">
        {({ navigation }) => (
          <RecurringThemeScreen
            onNext={() => navigation.navigate('CommunicationMedium')}
            onBack={() => navigation.goBack()}
            progress={getProgress('RecurringTheme')}
          />
        )}
      </Stack.Screen>

      {/* Quiz Screen 9: Communication Medium — how fights happen */}
      <Stack.Screen name="CommunicationMedium">
        {({ navigation }) => (
          <CommunicationMediumScreen
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
            progress={getProgress('CommunicationMedium')}
          />
        )}
      </Stack.Screen>

      {/* Create Account (inline auth — before Consent which needs JWT) */}
      <Stack.Screen name="CreateAccount">
        {({ navigation }) => (
          <RegisterScreen
            onNavigateLogin={() => navigation.navigate('Login')}
            onSuccess={() => navigation.navigate('Consent')}
          />
        )}
      </Stack.Screen>

      {/* Login (for returning users who already have an account) */}
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onNavigateRegister={() => navigation.navigate('CreateAccount')}
            onNavigateForgot={() => {}} // no-op for now
            onSuccess={() => navigation.navigate('Consent')}
          />
        )}
      </Stack.Screen>

      {/* Legal Consent (requires JWT — must come after auth) */}
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

              const coupleState = useAuthStore.getState().couple;
              // User B already has a couple — skip InvitePartner, go to Connected
              if (coupleState?.userBId) {
                navigation.navigate('Connected');
              } else {
                navigation.navigate('InvitePartner');
              }
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      {/* Invite Partner — after inviting, go straight to notifications then paywall */}
      <Stack.Screen name="InvitePartner">
        {({ navigation }) => (
          <InvitePartnerScreen
            onPartnerJoined={() => navigation.replace('NotificationPermission')}
            onGoToAccept={() => navigation.navigate('AcceptInvite', { fromInvitePartner: true })}
            onSkip={() => navigation.replace('NotificationPermission')}
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

      {/* Waiting for Partner (legacy — kept for deep links) */}
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

      {/* Connected Celebration (User B path) */}
      <Stack.Screen name="Connected">
        {({ navigation }) => (
          <ConnectedScreen
            onBegin={() => navigation.replace('NotificationPermission')}
          />
        )}
      </Stack.Screen>

      {/* Notification Permission (before paywall) */}
      <Stack.Screen name="NotificationPermission">
        {({ navigation }) => (
          <NotificationPermissionScreen onNext={() => navigation.replace('Paywall')} />
        )}
      </Stack.Screen>

      {/* Paywall — final onboarding step, then enter main app */}
      <Stack.Screen name="Paywall">
        {() => (
          <PaywallScreen
            onSkip={finishOnboarding}
            onPurchased={finishOnboarding}
          />
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
