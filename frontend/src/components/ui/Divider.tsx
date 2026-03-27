/**
 * Divider — Thin horizontal line separator.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "Divider"
 *
 * Color: border (#E8DDD4) — warm neutral, hairline width.
 * Margin: 16px vertical by default (overridable via style prop).
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface DividerProps {
  style?: ViewStyle;
}

export function Divider({ style }: DividerProps) {
  return (
    <View style={[styles.divider, style]} />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
});
