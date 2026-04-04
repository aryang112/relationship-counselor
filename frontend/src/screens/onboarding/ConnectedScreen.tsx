/**
 * ConnectedScreen — Celebration screen shown when both partners are linked.
 *
 * Displays both partner avatars with a heart between them, a warm
 * congratulatory message, and a summary card showing the couple's
 * key data. The "Begin" button transitions to the main app.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { successTap } from '../../utils/haptics';

interface ConnectedScreenProps {
  onBegin: () => void;
}

export function ConnectedScreen({ onBegin }: ConnectedScreenProps) {
  const store = useOnboardingStore();
  const firstName = store.firstName || 'You';
  const partnerName = store.partnerName || 'Partner';

  // Avatar entrance animations
  const avatarAScale = useSharedValue(0);
  const avatarBScale = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartPulse = useSharedValue(1);

  useEffect(() => {
    successTap();

    avatarAScale.value = withDelay(
      200,
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    avatarBScale.value = withDelay(
      400,
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    heartScale.value = withDelay(
      700,
      withSpring(1, { damping: 10, stiffness: 180 }),
    );
    heartOpacity.value = withDelay(
      700,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );

    // Gentle breathing pulse on the heart after it appears
    heartPulse.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, []);

  const avatarAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarAScale.value }],
  }));

  const avatarBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarBScale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value * heartPulse.value }],
    opacity: heartOpacity.value,
  }));

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      <Container style={styles.container}>
        {/* Avatar pair with heart */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(300).springify().damping(14)}
          style={styles.avatarRow}
        >
          <Animated.View style={[styles.avatar, styles.avatarA, avatarAStyle]}>
            <Text style={styles.avatarInitial}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.heart, heartStyle]}>
            <Text style={styles.heartText}>{'<3'}</Text>
          </Animated.View>

          <Animated.View style={[styles.avatar, styles.avatarB, avatarBStyle]}>
            <Text style={styles.avatarInitial}>
              {partnerName.charAt(0).toUpperCase()}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Connected text */}
        <Animated.View entering={FadeIn.duration(800)}>
          <Text style={styles.title} accessibilityRole="header">You're connected.</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(600).delay(600)}>
          <Text style={styles.subtitle}>
            {firstName} & {partnerName} are ready to start understanding each
            other better.
          </Text>
        </Animated.View>

        {/* Stats card */}
        <Animated.View entering={FadeIn.duration(600).delay(600)}>
          <Card elevated style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>2</Text>
                <Text style={styles.statLabel}>Partners</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>8</Text>
                <Text style={styles.statLabel}>Insights</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>1</Text>
                <Text style={styles.statLabel}>Journey</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Begin button */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(800)}
          style={styles.actions}
        >
          <Button title="Begin" onPress={onBegin} size="lg" />
        </Animated.View>
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarA: {
    backgroundColor: colors.orangeTint,
    borderWidth: 3,
    borderColor: colors.orangeMid,
  },
  avatarB: {
    backgroundColor: 'rgba(123, 143, 166, 0.15)',
    borderWidth: 3,
    borderColor: colors.partnerB,
  },
  avatarInitial: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    color: colors.textPrimary,
  },
  heart: {
    marginHorizontal: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 120, 50, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartText: {
    fontFamily: fontFamilies.display,
    fontSize: 18,
    color: colors.orangeMid,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 44,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  statsCard: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 28,
    color: colors.orangeDeep,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  actions: {
    width: '100%',
  },
});
