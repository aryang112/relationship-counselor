/**
 * Toast — Top-of-screen notification banner with auto-dismiss.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "Toast"
 *
 * Types and their backgrounds (warm-light palette):
 *   - success: safe (#E8F4EA) bg, success (#5A8A6A) text.
 *   - error:   error red tint bg, error (#E07070) text.
 *   - info:    orangeTint (#FBE8D8) bg, orangeDeep (#C45A1A) text.
 *   - warning: warm amber tint bg, warning dark text.
 *
 * Border-radius: md (16px).
 * Shadow: warm md shadow for float effect.
 * Animation: Spring slide-down from top, auto-dismiss after 4s.
 * Border: 1px matching tint color for definition on white backgrounds.
 */

import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { shadows, radius } from '../../theme/spacing';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onDismiss: () => void;
}

/** Background, text, and border colors per toast type. */
const toastStyles = {
  success: {
    bg: colors.safe,
    text: colors.success,
    border: colors.success + '40',
  },
  error: {
    bg: colors.error + '18',
    text: colors.error,
    border: colors.error + '40',
  },
  info: {
    bg: colors.orangeTint,
    text: colors.orangeDeep,
    border: colors.orangeGlow,
  },
  warning: {
    bg: colors.warning + '20',
    text: '#8B6914',
    border: colors.warning + '60',
  },
} as const;

export function Toast({ message, type, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const variant = toastStyles[type];

  useEffect(() => {
    translateY.value = withSequence(
      withTiming(0, { duration: 300 }),
      withDelay(3500, withTiming(-120, { duration: 300 })),
    );
    const timer = setTimeout(() => onDismissRef.current(), 4000);
    return () => clearTimeout(timer);
  }, [translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.toast,
        shadows.md,
        {
          backgroundColor: variant.bg,
          borderColor: variant.border,
          top: insets.top + 8,
        },
        animStyle,
      ]}
    >
      <Text style={[styles.text, { color: variant.text }]} numberOfLines={3}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    zIndex: 1000,
    elevation: 10,
  },
  text: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
