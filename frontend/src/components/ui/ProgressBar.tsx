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

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';

interface ProgressBarProps {
  progress: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, style }: ProgressBarProps) {
  /** Clamp between 0 and 1 for safety. */
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={[styles.track, style]}>
      <LinearGradient
        colors={colors.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.fill,
          { width: `${clamped * 100}%` },
        ]}
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
