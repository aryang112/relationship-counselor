/**
 * NotificationPermissionScreen — Asks the user to enable push notifications
 * during onboarding, after the Agreement screen.
 *
 * Design: Warm light theme, matches existing onboarding screens.
 *   - Bell emoji in orangeTint circle (96px, like InterviewCompleteScreen)
 *   - Cormorant Garamond display title
 *   - 3 benefit items with emoji + DM Sans body text
 *   - Primary CTA: "Enable Notifications" -> requests permission + registers token
 *   - Ghost secondary: "Maybe later" -> skips to next screen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, spacing, shadows, radius } from '../../theme';
import { registerPushToken } from '../../services/notifications';

interface NotificationPermissionScreenProps {
  onNext: () => void;
}

const BENEFITS = [
  { emoji: '\uD83D\uDCAC', text: 'Know when your partner shares their perspective' },
  { emoji: '\uD83D\uDD14', text: 'Get gentle reminders for your sessions' },
  { emoji: '\u2728', text: 'See when your insights are ready' },
];

export function NotificationPermissionScreen({ onNext }: NotificationPermissionScreenProps) {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // Only attempt token registration on real devices
        if (Constants.isDevice) {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          if (projectId) {
            try {
              const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
              await registerPushToken(tokenData.data);
            } catch {
              // Token registration failed — not critical, continue onboarding
              console.log('[NOTIFICATIONS] Failed to get/register push token');
            }
          }
        }
      }
    } catch {
      // Permission request failed — continue anyway
      console.log('[NOTIFICATIONS] Permission request failed');
    } finally {
      setLoading(false);
      onNext();
    }
  };

  return (
    <SafeArea>
      <View style={styles.container}>
        <Container style={styles.content}>
          {/* Bell emoji with backdrop circle */}
          <View style={styles.emojiCircle}>
            <Text style={styles.emoji}>{'\uD83D\uDD14'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Stay connected</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            We'll only reach out when it matters.
          </Text>

          {/* Benefit items */}
          <View style={styles.benefitsContainer}>
            {BENEFITS.map((item, index) => (
              <View key={index} style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>{item.emoji}</Text>
                <Text style={styles.benefitText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Primary CTA */}
          <Button
            title="Enable Notifications"
            onPress={handleEnable}
            loading={loading}
            size="lg"
            style={styles.enableBtn}
          />

          {/* Ghost secondary */}
          <Pressable onPress={onNext} style={styles.skipBtn}>
            <Text style={styles.skipText}>Maybe later</Text>
          </Pressable>
        </Container>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
  },
  content: {
    alignItems: 'center',
  },

  // Emoji with backdrop circle (matches InterviewCompleteScreen)
  emojiCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  emoji: {
    fontSize: 48,
  },

  // Title — Cormorant Garamond display
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },

  // Subtitle — DM Sans body
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Benefits list
  benefitsContainer: {
    width: '100%',
    maxWidth: 340,
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 12,
    ...shadows.card,
  },
  benefitEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    flex: 1,
  },

  // Primary button
  enableBtn: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },

  // Ghost skip button
  skipBtn: {
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textMuted,
  },
});
