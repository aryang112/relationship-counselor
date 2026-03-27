/**
 * PrivacyBadge — "Only you can see your responses" safety indicator.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "PrivacyBadge"
 *
 * Background: safe (#E8F4EA) — soft green tint.
 * Text: success (#5A8A6A) — muted green.
 * Shape: Pill (border-radius 9999), self-centered.
 * Icon: Lock emoji prefix.
 *
 * Displayed on interview/private entry screens to reassure users
 * that their responses are confidential.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export function PrivacyBadge() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{'🔒'}</Text>
      <Text style={styles.text}>
        Only you can see your responses
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    alignSelf: 'center',
    backgroundColor: colors.safe,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  text: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    fontWeight: '500',
    color: colors.success,
  },
});
