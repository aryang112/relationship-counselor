/**
 * KeyboardDoneBar — iOS keyboard accessory with a "Done" button.
 *
 * Renders an InputAccessoryView above the keyboard so multiline
 * TextInputs have a clear way to dismiss. On Android this is a no-op
 * since the back button already dismisses the keyboard.
 *
 * Usage:
 *   1. Render <KeyboardDoneBar /> once in the screen
 *   2. Add inputAccessoryViewID={KEYBOARD_DONE_ID} to each multiline TextInput
 */

import React from 'react';
import {
  InputAccessoryView,
  View,
  Text,
  Pressable,
  Keyboard,
  Platform,
  StyleSheet,
} from 'react-native';
import { colors, fontFamilies, spacing } from '../../theme';

export const KEYBOARD_DONE_ID = 'keyboard-done-bar';

export function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={styles.bar}>
        <View style={styles.spacer} />
        <Pressable onPress={Keyboard.dismiss} hitSlop={8}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  spacer: {
    flex: 1,
  },
  doneText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    color: colors.orangeMid,
  },
});
