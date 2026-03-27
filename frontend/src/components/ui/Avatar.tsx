/**
 * Avatar — Circular user initial display with optional partner ring.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "Avatar"
 *
 * Sizes: sm (32px), md (44px), lg (56px), xl (72px).
 * Background: orangeTint (#FBE8D8) — soft warm orange tint.
 * Text color: orangeDeep (#C45A1A) — initials in deep orange.
 * Font: Cormorant Garamond 500 weight (display font).
 *
 * Partner rings:
 *   - Partner A → partnerA (#E07832) orange, 2.5px border.
 *   - Partner B → partnerB (#7B8FA6) cool blue-gray, 2.5px border.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { getInitials } from '../../utils/format';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  partnerRole?: 'A' | 'B' | null;
  style?: ViewStyle;
}

const sizes: Record<AvatarSize, { container: number; font: number }> = {
  sm: { container: 32, font: 12 },
  md: { container: 44, font: 16 },
  lg: { container: 56, font: 20 },
  xl: { container: 72, font: 26 },
};

const ringColor: Record<'A' | 'B', string> = {
  A: colors.partnerA,
  B: colors.partnerB,
};

export function Avatar({ name, size = 'md', partnerRole, style }: AvatarProps) {
  const s = sizes[size];
  const ring = partnerRole ? ringColor[partnerRole] : undefined;

  return (
    <View
      style={[
        styles.base,
        {
          width: s.container,
          height: s.container,
          borderRadius: s.container / 2,
          backgroundColor: colors.orangeTint,
          borderWidth: ring ? 2.5 : 0,
          borderColor: ring ?? 'transparent',
        },
        style,
      ]}
      accessibilityLabel={name}
    >
      <Text style={[styles.text, { fontSize: s.font, color: colors.orangeDeep }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontWeight: '500',
  },
});
