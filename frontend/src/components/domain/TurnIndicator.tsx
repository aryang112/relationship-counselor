/**
 * TurnIndicator -- Pill showing whose turn it is in the reconnection chat.
 *
 * Design: RelateApp_DesignSpec.md -- warm-light theme.
 *   - Pill shape (999 radius)
 *   - Active (your turn): orangeTint bg, orangeDeep text
 *   - Waiting (partner's turn): bgSecondary bg, textSecondary text
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius } from '../../theme';

interface TurnIndicatorProps {
  /** Whether it is the current user's turn. */
  isMyTurn: boolean;
  /** Display name of the partner (for "waiting" state). */
  partnerName: string;
}

export function TurnIndicator({ isMyTurn, partnerName }: TurnIndicatorProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isMyTurn ? colors.orangeTint : colors.bgSecondary,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: isMyTurn ? colors.orangeDeep : colors.textSecondary,
          },
        ]}
      >
        {isMyTurn ? 'Your turn to share' : `Waiting for ${partnerName}...`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  label: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
  },
});
