/**
 * MainNavigator — Primary navigation structure for authenticated users.
 *
 * Contains:
 *   1. Bottom tab navigator (Home / Sessions / Reconnect / Us)
 *   2. Stack navigator layered on top for full-screen flows
 *
 * Tab bar follows RelateApp_DesignSpec §4:
 *   - Background: bgElevated (#FFFFFF)
 *   - Top border: 1px solid #F0E8E0 (warm light border)
 *   - Active: orangeMid (#E07832)
 *   - Inactive: textMuted (#A89880)
 *   - Icons: lucide-react-native Home, MessageCircle, Heart, Users
 *
 * Stack screens include all session flow screens, settings, and new
 * screens for StartMediation, WaitingForPartner, UsProfile, LoveBank,
 * and LearningsHistory.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageCircle, Heart, Users } from 'lucide-react-native';
import { HomeScreen } from '../screens/dashboard/HomeScreen';
import { SessionListScreen } from '../screens/dashboard/SessionListScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { SessionDetailScreen } from '../screens/session/SessionDetailScreen';
import { StartSessionScreen } from '../screens/session/StartSessionScreen';
import { InterviewScreen } from '../screens/interview/InterviewScreen';
import { InterviewCompleteScreen } from '../screens/interview/InterviewCompleteScreen';
import { UnpackingChoiceScreen } from '../screens/unpacking/UnpackingChoiceScreen';
import { UnpackingScreen } from '../screens/unpacking/UnpackingScreen';
import { ReconnectTabScreen } from '../screens/reconnection/ReconnectTabScreen';
import { ReconnectionScreen } from '../screens/reconnection/ReconnectionScreen';
import { CommitmentsScreen } from '../screens/reconnection/CommitmentsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { UsProfileScreen } from '../screens/profile/UsProfileScreen';
import { LoveBankScreen } from '../screens/profile/LoveBankScreen';
import { LearningsHistoryScreen } from '../screens/profile/LearningsHistoryScreen';
import { DeleteAccountScreen } from '../screens/settings/DeleteAccountScreen';
import { PaywallScreen } from '../screens/subscription/PaywallScreen';
import { StartMediationScreen } from '../screens/session/StartMediationScreen';
import { PreSessionReminderScreen } from '../screens/session/PreSessionReminderScreen';
import { WaitingForPartnerScreen } from '../screens/session/WaitingForPartnerScreen';
import { PartnerBEntryScreen } from '../screens/session/PartnerBEntryScreen';
import { colors } from '../theme/colors';
import { shadows } from '../theme/spacing';

// ── Type Definitions ────────────────────────────────────────────────

export type MainNavigatorParamList = {
  HomeTabs: undefined;
  SessionDetail: { id: string };
  StartSession: undefined;
  StartMediation: undefined;
  PreSessionReminder: { sessionId: string };
  WaitingForPartner: { sessionId?: string } | undefined;
  PartnerBEntry: { sessionId: string };
  Interview: { sessionId: string; partnerBOpeningMessage?: string; readOnly?: boolean };
  InterviewComplete: { partnerName?: string } | undefined;
  UnpackingChoice: { sessionId: string };
  Unpacking: { sessionId: string };
  Reconnection: { sessionId: string };
  Commitments: { sessionId: string };
  Settings: undefined;
  DeleteAccount: undefined;
  Profile: undefined;
  UsProfile: undefined;
  LoveBank: undefined;
  LearningsHistory: undefined;
  Paywall: undefined;
  // Tab screens (accessible from stack)
  Home: undefined;
  SessionList: undefined;
};

export type TabParamList = {
  Home: undefined;
  Sessions: undefined;
  Reconnect: undefined;
  Us: undefined;
};

// ── Tab Navigator ───────────────────────────────────────────────────

const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.orangeMid,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, focused }) => {
          const iconProps = { color, size: 24, strokeWidth: focused ? 2.5 : 1.8 };
          if (route.name === 'Home') return <Home {...iconProps} />;
          if (route.name === 'Sessions') return <MessageCircle {...iconProps} />;
          if (route.name === 'Reconnect') return <Heart {...iconProps} />;
          if (route.name === 'Us') return <Users {...iconProps} />;
          return null;
        },
        tabBarItemStyle: styles.tabBarItem,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Sessions" component={SessionListScreen} />
      <Tab.Screen name="Reconnect" component={ReconnectTabScreen} />
      <Tab.Screen name="Us" component={UsProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Stack Navigator ─────────────────────────────────────────────────

const Stack = createNativeStackNavigator<MainNavigatorParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.bgPrimary },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="HomeTabs" component={TabNavigator} />
      <Stack.Screen name="SessionList" component={SessionListScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="StartSession" component={StartSessionScreen} />
      <Stack.Screen name="StartMediation" component={StartMediationScreen} />
      <Stack.Screen name="PreSessionReminder" component={PreSessionReminderScreen} />
      <Stack.Screen name="WaitingForPartner" component={WaitingForPartnerScreen} />
      <Stack.Screen name="PartnerBEntry" options={{ animation: 'fade', animationDuration: 350 }}>
        {({ route, navigation }) => (
          <PartnerBEntryScreen
            sessionId={route.params.sessionId}
            onStartInterview={(openingMessage) =>
              navigation.replace('Interview', {
                sessionId: route.params.sessionId,
                partnerBOpeningMessage: openingMessage,
              })
            }
            onGoBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Interview" options={{ animation: 'fade', animationDuration: 400 }}>
        {({ route, navigation }) => (
          <InterviewScreen
            sessionId={route.params.sessionId}
            partnerBOpeningMessage={route.params.partnerBOpeningMessage}
            readOnly={route.params.readOnly}
            onExit={() => navigation.goBack()}
            onComplete={() => navigation.replace('InterviewComplete', undefined)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="InterviewComplete">
        {({ route, navigation }) => (
          <InterviewCompleteScreen
            partnerName={route.params?.partnerName}
            onContinue={() => navigation.navigate('HomeTabs')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="UnpackingChoice" component={UnpackingChoiceScreen} />
      <Stack.Screen name="Unpacking" component={UnpackingScreen} />
      <Stack.Screen name="Reconnection" component={ReconnectionScreen} />
      <Stack.Screen name="Commitments" component={CommitmentsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="UsProfile" component={UsProfileScreen} />
      <Stack.Screen name="LoveBank" component={LoveBankScreen} />
      <Stack.Screen name="LearningsHistory" component={LearningsHistoryScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
    </Stack.Navigator>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
    ...shadows.sm,
  },
  tabBarLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  tabBarItem: {
    paddingTop: 4,
  },
});
