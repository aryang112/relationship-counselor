/**
 * PromiseScreen — Sets the emotional tone for the onboarding experience.
 *
 * Displays a warm promise message with two overlapping decorative orbs
 * (orange and blue-gray) and a large serif headline emphasizing that
 * both partners will be heard equally.
 *
 * "both of you" is rendered in italic orange for emotional emphasis.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PromiseScreenProps {
  onContinue: () => void;
}

export function PromiseScreen({ onContinue }: PromiseScreenProps) {
  const orbScale = useSharedValue(0.6);
  const orbOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
    orbOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    orbScale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });

    textOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    textTranslateY.value = withDelay(
      500,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ scale: orbScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      <View style={styles.container}>
        {/* Overlapping orbs */}
        <Animated.View style={[styles.orbContainer, orbStyle]}>
          <View style={[styles.orb, styles.orbOrange]} />
          <View style={[styles.orb, styles.orbBlue]} />
        </Animated.View>

        {/* Promise text */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.heroText}>
            {'This is a space where '}
            <Text style={styles.heroItalic}>both of you</Text>
            {' are heard.'}
          </Text>

          <Text style={styles.subText}>
            Not one side. Not the loudest voice.{'\n'}
            Both of you, completely.
          </Text>

          <Text style={styles.disclaimerText}>
            Relate is an AI mediation tool, not a licensed therapist or mental
            health service.
          </Text>
        </Animated.View>

        {/* Continue button */}
        <View style={styles.actions}>
          <Button title="Continue" onPress={onContinue} size="lg" />
        </View>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
    height: 180,
  },
  orb: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  orbOrange: {
    backgroundColor: 'rgba(224, 120, 50, 0.25)',
    left: SCREEN_WIDTH / 2 - 100,
  },
  orbBlue: {
    backgroundColor: 'rgba(123, 143, 166, 0.2)',
    left: SCREEN_WIDTH / 2 - 40,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  heroText: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 44,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroItalic: {
    fontFamily: fontFamilies.displayItalic,
    color: colors.orangeMid,
  },
  subText: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  disclaimerText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  actions: {
    paddingBottom: spacing.xl,
  },
});
