/**
 * RevealCard — Gradient card for the unpacking/reveal screen (Spotify Wrapped-style).
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "RevealCard"
 *
 * Variants:
 *   - 'orange': gradientCard ['#F0A060','#C45A1A'] — Partner A insights.
 *   - 'blue':   Partner B gradient ['#7B8FA6','#5A7089'] — cool blue-gray.
 *   - 'shared': Lavender gradient ['#B9A4DC','#9B7EC8'] — shared insights.
 *   - 'warm':   bgElevated (#FFFFFF) solid — neutral content cards.
 *
 * Border-radius: 18px.
 * Padding: 16px.
 * Label: 9px weight 700, uppercase, slightly transparent (eyebrow text).
 *
 * Gradient variants use LinearGradient; 'warm' variant uses plain View.
 * Text on gradient variants should be white; 'warm' uses textPrimary.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';

type RevealCardVariant = 'orange' | 'blue' | 'shared' | 'warm';

interface RevealCardProps {
  variant?: RevealCardVariant;
  label?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Gradient color pairs for each non-solid variant. */
const gradientColors: Record<Exclude<RevealCardVariant, 'warm'>, [string, string]> = {
  orange: colors.gradientCard,
  blue: ['#7B8FA6', '#5A7089'],
  shared: ['#B9A4DC', '#9B7EC8'],
};

export function RevealCard({
  variant = 'warm',
  label,
  children,
  style,
}: RevealCardProps) {
  const isGradient = variant !== 'warm';
  const labelColor = isGradient ? 'rgba(255,255,255,0.7)' : colors.textMuted;

  const labelElement = label ? (
    <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
  ) : null;

  if (isGradient) {
    return (
      <LinearGradient
        colors={gradientColors[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadows.sm, style]}
      >
        {labelElement}
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, styles.warmCard, shadows.card, style]}>
      {labelElement}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
  },
  warmCard: {
    backgroundColor: colors.bgElevated,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
});
