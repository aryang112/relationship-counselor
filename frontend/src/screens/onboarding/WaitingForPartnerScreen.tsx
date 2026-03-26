/**
 * WaitingForPartnerScreen — Displayed while the user waits for their
 * partner to join using the invite code.
 *
 * Features two pulsing circles (orange for the user, blue-gray for
 * the partner) that animate toward each other. Shows the partner's
 * name and a "Send Reminder" button.
 *
 * Polls the backend every 5 seconds to check if partner has joined.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { getMyCouple } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { successTap } from '../../utils/haptics';

interface WaitingForPartnerScreenProps {
  onPartnerJoined: () => void;
  onSendReminder: () => void;
  onBack: () => void;
}

export function WaitingForPartnerScreen({
  onPartnerJoined,
  onSendReminder,
  onBack,
}: WaitingForPartnerScreenProps) {
  const partnerName = useOnboardingStore((s) => s.partnerName) || 'your partner';
  const setCouple = useAuthStore((s) => s.setCouple);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsing animation for the two circles
  const pulseA = useSharedValue(1);
  const pulseB = useSharedValue(1);
  const floatY = useSharedValue(0);

  useEffect(() => {
    pulseA.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    pulseB.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );

    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  // Poll for partner joining
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const couple = await getMyCouple();
        if (couple.userBId) {
          setCouple(couple);
          successTap();
          onPartnerJoined();
        }
      } catch {
        // Ignore errors, keep polling
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [setCouple, onPartnerJoined]);

  const orbAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseA.value }],
  }));

  const orbBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseB.value }],
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      <Container style={styles.container}>
        {/* Pulsing orbs */}
        <Animated.View style={[styles.orbContainer, floatStyle]}>
          <Animated.View style={[styles.orb, styles.orbOrange, orbAStyle]}>
            <Text style={styles.orbLabel}>You</Text>
          </Animated.View>
          <Animated.View style={[styles.orb, styles.orbBlue, orbBStyle]}>
            <Text style={styles.orbLabel}>?</Text>
          </Animated.View>
        </Animated.View>

        {/* Status text */}
        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Text style={styles.title}>
            Waiting for {partnerName} to join...
          </Text>
          <Text style={styles.subtitle}>
            We'll connect you automatically once they enter the code.
          </Text>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Send a Reminder"
            onPress={onSendReminder}
            variant="secondary"
            size="lg"
            style={styles.reminderBtn}
          />
          <Button title="Go back" onPress={onBack} variant="ghost" />
        </View>
      </Container>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    gap: spacing.xl,
  },
  orb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbOrange: {
    backgroundColor: 'rgba(224, 120, 50, 0.2)',
    borderWidth: 2,
    borderColor: colors.orangeMid,
  },
  orbBlue: {
    backgroundColor: 'rgba(123, 143, 166, 0.15)',
    borderWidth: 2,
    borderColor: colors.partnerB,
    borderStyle: 'dashed',
  },
  orbLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  actions: {
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  reminderBtn: {
    marginBottom: spacing.sm,
  },
});
