/**
 * PreSessionReminderScreen — Lightweight safety reminder shown before the venting session.
 *
 * Displayed after session creation (from StartMediationScreen) and before the
 * Interview screen. Reminds the user that their responses are private, that
 * Relate is not a replacement for therapy, and provides access to crisis
 * resources via a modal.
 *
 * This is NOT a consent gate (no checkbox). The user taps "I'm Ready to Share"
 * to proceed to the Interview screen.
 *
 * Route params: { sessionId: string } — passed from StartMediationScreen and
 * forwarded to Interview on proceed.
 *
 * Design System: RelateApp_DesignSpec.md — warm light theme, gradientSoft background.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { CrisisResourcesModal } from '../../components/domain/CrisisResourcesModal';
import { useAuthStore } from '../../store/authStore';
import { colors, fontFamilies, spacing, radius } from '../../theme';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;
type PreSessionRoute = RouteProp<MainNavigatorParamList, 'PreSessionReminder'>;

export function PreSessionReminderScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PreSessionRoute>();
  const { sessionId } = route.params;

  const couple = useAuthStore((s) => s.couple);
  const user = useAuthStore((s) => s.user);

  const [crisisModalVisible, setCrisisModalVisible] = useState(false);

  /** Derive partner's first name for the privacy message */
  const isUserA = user?.id === couple?.userAId;
  const partner = isUserA ? couple?.userB : couple?.userA;
  const partnerName = partner?.name?.split(' ')[0] || 'Your partner';

  /** Navigate to the Interview screen, replacing this screen in the stack */
  const handleProceed = () => {
    navigation.replace('Interview', { sessionId });
  };

  return (
    <LinearGradient
      colors={colors.gradientSoft}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <SafeArea>
        <View style={styles.content}>
          {/* Back button */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ArrowLeft color={colors.textSecondary} size={22} />
          </Pressable>

          {/* Main content */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={styles.mainSection}
          >
            {/* Headline */}
            <Text style={styles.headline}>This is your space.</Text>

            {/* Body text */}
            <Text style={styles.bodyText}>
              Everything you share here is private. {partnerName} won't see your
              words — only the insights we find together.
            </Text>
            <Text style={styles.bodyText}>
              Relate helps you understand each other. It doesn't replace a
              therapist, and it's not for emergencies.
            </Text>
          </Animated.View>

          {/* Bottom section — pushed to the bottom */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(300)}
            style={styles.bottomSection}
          >
            {/* Crisis resources link */}
            <Pressable
              onPress={() => setCrisisModalVisible(true)}
              style={styles.crisisLink}
              accessibilityRole="link"
              accessibilityLabel="Need immediate support? Open crisis resources"
            >
              <Text style={styles.crisisLinkText}>
                Need immediate support?{' '}
                <Text style={styles.crisisLinkArrow}>Crisis Resources</Text>
              </Text>
            </Pressable>

            {/* CTA button */}
            <Button
              title="I'm Ready to Share"
              onPress={handleProceed}
              size="lg"
              style={styles.ctaBtn}
            />
          </Animated.View>
        </View>

        {/* Crisis Resources Modal */}
        <CrisisResourcesModal
          visible={crisisModalVisible}
          onClose={() => setCrisisModalVisible(false)}
        />
      </SafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Back button
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },

  // Main content
  mainSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headline: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  bodyText: {
    fontFamily: fontFamilies.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Bottom section
  bottomSection: {
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  crisisLink: {
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  crisisLinkText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  crisisLinkArrow: {
    fontFamily: fontFamilies.bodyBold,
    fontWeight: '600',
    color: colors.orangeMid,
  },

  // CTA
  ctaBtn: {
    width: '100%',
  },
});
