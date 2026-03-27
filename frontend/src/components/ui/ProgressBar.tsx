/**
 * ProgressBar — Thin horizontal progress indicator with orange gradient fill.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "ProgressBar"
 *
 * Track: 3px height, border (#E8DDD4) background.
 * Fill: Orange gradient via LinearGradient (gradientCard colors).
 * Border-radius: pill (fully rounded ends).
 *
 * Props:
 *   - progress: Number 0–1 representing completion percentage.
 *   - style:    Optional ViewStyle override for the outer container.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface ProgressBarProps {
  progress: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, style }: ProgressBarProps) {
  /** Clamp between 0 and 1 for safety. */
  const clamped = Math.min(1, Math.max(0, progress));

  const widthProgress = useSharedValue(clamped);
  const glowScale = useSharedValue(1);
  const prevProgress = useRef(clamped);

  useEffect(() => {
    /** Animate width smoothly on progress change. */
    widthProgress.value = withTiming(clamped, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    /** Trigger a subtle glow pulse when progress increases. */
    if (clamped > prevProgress.current) {
      glowScale.value = withSequence(
        withTiming(1.5, { duration: 200 }),
        withTiming(1, { duration: 300 }),
      );
    }

    prevProgress.current = clamped;
  }, [clamped, widthProgress, glowScale]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value * 100}%`,
    transform: [{ scaleY: glowScale.value }],
  }));

  return (
    <View style={[styles.track, style]}>
      <AnimatedLinearGradient
        colors={colors.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, animatedFillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
