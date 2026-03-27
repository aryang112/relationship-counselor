/**
 * ProfileScreen -- Personal profile view (tab bar "Profile" tab).
 *
 * Design: RelateApp_DesignSpec.md -- warm-light theme.
 *   - bgPrimary background
 *   - User info card with avatar and name/email
 *   - Partner connection status
 *   - Links to Us Profile, Settings, Privacy
 *
 * Note: This is the individual user's profile, not the couple's "Us" profile.
 * For the couple profile, see UsProfileScreen.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Heart,
  Settings,
  Shield,
  Bell,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

/** Menu row items for the profile screen. */
interface MenuRow {
  key: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((s) => s.user);
  const couple = useAuthStore((s) => s.couple);
  const reset = useAuthStore((s) => s.reset);

  const menuRows: MenuRow[] = [
    {
      key: 'us',
      icon: <Heart size={20} color={colors.orangeMid} />,
      label: 'Us Profile',
      subtitle: couple?.userB ? `You & ${couple.userB.name}` : 'Connect your partner',
      onPress: () => {
        // Navigate to UsProfile when it's registered in navigator
        // For now, a placeholder
      },
    },
    {
      key: 'settings',
      icon: <Settings size={20} color={colors.textSecondary} />,
      label: 'Settings',
      subtitle: 'Notifications, preferences',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      key: 'privacy',
      icon: <Shield size={20} color={colors.textSecondary} />,
      label: 'Privacy & Safety',
      subtitle: 'Your data is encrypted end-to-end',
      onPress: () => {},
    },
    {
      key: 'notifications',
      icon: <Bell size={20} color={colors.textSecondary} />,
      label: 'Notifications',
      subtitle: 'Manage reminder preferences',
      onPress: () => {},
    },
  ];

  return (
    <SafeArea>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.screenTitle}>Profile</Text>
        </Animated.View>

        {/* User identity card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card style={styles.identityCard} elevated>
            <View style={styles.identityRow}>
              <Avatar name={user?.name || 'You'} size="lg" partnerRole="A" />
              <View style={styles.identityInfo}>
                <Text style={styles.userName}>{user?.name || 'Unknown'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
              </View>
            </View>

            {/* Partner status */}
            <View style={styles.partnerRow}>
              <View style={[styles.statusDot, {
                backgroundColor: couple?.userB ? colors.success : colors.warning,
              }]} />
              <Text style={styles.partnerText}>
                {couple?.userB
                  ? `Connected with ${couple.userB.name}`
                  : 'Partner not connected yet'}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Menu rows */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.menuSection}>
          {menuRows.map((row) => (
            <Pressable
              key={row.key}
              onPress={row.onPress}
              style={styles.menuRow}
            >
              <View style={styles.menuIconCircle}>{row.icon}</View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{row.label}</Text>
                {row.subtitle && (
                  <Text style={styles.menuSubtitle}>{row.subtitle}</Text>
                )}
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Pressable onPress={reset} style={styles.signOutRow}>
            <LogOut size={18} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </Animated.View>

        {/* App info */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.appInfo}>
          <Text style={styles.appInfoText}>Relate v1.0</Text>
          <Text style={styles.appInfoText}>Your conversations are private and encrypted.</Text>
        </Animated.View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ---- Header ----
  header: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  screenTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    color: colors.textPrimary,
  },

  // ---- Identity card ----
  identityCard: {
    marginBottom: 24,
    gap: 16,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  identityInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  partnerText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // ---- Menu rows ----
  menuSection: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 24,
    ...shadows.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },

  // ---- Sign out ----
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 24,
  },
  signOutText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.error,
  },

  // ---- App info ----
  appInfo: {
    alignItems: 'center',
    gap: 4,
  },
  appInfoText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
