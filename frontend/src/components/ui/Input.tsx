/**
 * Input — Text input field with label, validation, and icon support.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "Input Field"
 *
 * Background: bgElevated (#FFFFFF) — white on warm off-white base.
 * Border: 1.5px solid border (#E8DDD4).
 * Focus border: borderFocus / orangeMid (#E07832).
 * Height: 56px.
 * Font: DM Sans 16px regular.
 * Placeholder color: textMuted (#A89880).
 * Border-radius: md (16px).
 *
 * Error state: red border + shake animation + haptic feedback.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { shadows, radius } from '../../theme/spacing';
import { errorTap } from '../../utils/haptics';

const AnimatedView = Animated.createAnimatedComponent(View);

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  leftIcon,
  rightIcon,
  secureTextEntry,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);
  const shakeX = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  React.useEffect(() => {
    if (error) {
      errorTap();
      shakeX.value = withSequence(
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shakeX]);

  const borderColor = error
    ? colors.error
    : focused
      ? colors.borderFocus
      : colors.border;

  return (
    <AnimatedView style={[styles.container, shakeStyle, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrap,
          {
            borderColor,
            backgroundColor: colors.bgElevated,
          },
          focused && { borderWidth: 2 },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : undefined,
            (rightIcon || secureTextEntry) ? { paddingRight: 0 } : undefined,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          secureTextEntry={secureTextEntry && !secureVisible}
          {...(secureTextEntry ? { textContentType: 'oneTimeCode', autoComplete: 'off' } : {})}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setSecureVisible((v) => !v)}
            style={styles.secureToggle}
            hitSlop={8}
            accessibilityLabel={secureVisible ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.secureToggleText}>
              {secureVisible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {(error || helperText) && (
        <Text
          style={[
            styles.helper,
            { color: error ? colors.error : colors.textSecondary },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    color: colors.textSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    height: '100%',
    paddingVertical: 0,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 10,
  },
  secureToggle: {
    marginLeft: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  secureToggleText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.orangeMid,
  },
  helper: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
