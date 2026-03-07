/**
 * Card — Clean white container for content grouping.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "Card"
 *
 * Background: bgElevated (#FFFFFF) — pure white on warm off-white base.
 * Border-radius: lg (24px).
 * Shadow: warm card shadow (subtle, rgba(0,0,0,0.06)).
 * Padding: 24px.
 *
 * No BlurView or glass effect — the warm-light theme uses clean opaque cards.
 *
 * Props:
 *   - statusColor: Optional left-border accent (4px) for attribution/status.
 *   - elevated: Adds card shadow (default false for flat embed use).
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { shadows, radius } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  statusColor?: string;
  style?: ViewStyle;
  elevated?: boolean;
}

export function Card({ children, statusColor, style, elevated = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && shadows.card,
        statusColor && { borderLeftWidth: 4, borderLeftColor: statusColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: 24,
    overflow: 'hidden',
  },
});
