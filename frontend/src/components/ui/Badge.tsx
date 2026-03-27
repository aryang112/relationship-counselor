/**
 * Badge — Small status pill for labels, tags, and status indicators.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "Badge"
 *
 * Shape: 28px height, pill border-radius (999).
 * Font: DM Sans 600 weight, 11px, uppercase, letter-spacing 0.08.
 *
 * Variants (warm-light palette):
 *   - default: orangeTint bg, orangeDeep text.
 *   - success: safe green bg (#E8F4EA), success text (#5A8A6A).
 *   - warning: warm amber tint, warning text (#F0B84A).
 *   - error:   red tint, error text (#E07070).
 *   - info:    partnerB tint, partnerB text (#7B8FA6).
 *   - active:  orangeMid bg, white text (highlighted state).
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'active';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  const bgMap: Record<BadgeVariant, string> = {
    default: colors.orangeTint,
    success: colors.safe,
    warning: colors.warning + '25',
    error: colors.error + '20',
    info: colors.partnerB + '20',
    active: colors.orangeMid,
  };

  const textMap: Record<BadgeVariant, string> = {
    default: colors.orangeDeep,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.partnerB,
    active: '#FFFFFF',
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgMap[variant] }, style]}>
      <Text style={[styles.label, { color: textMap[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 28,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
  },
});
