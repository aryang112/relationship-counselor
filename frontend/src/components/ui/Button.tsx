/**
 * Button — Primary interactive control for the Relate app.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "Buttons"
 *
 * Variants:
 *   - primary:   Orange gradient fill (gradientCard), white text, warm glow shadow.
 *   - secondary: Transparent with orangeMid border, orangeMid text.
 *   - ghost:     No background, orangeMid text, underline on press.
 *   - danger:    Solid error-red fill, white text.
 *
 * Sizes: sm (40px), md (48px), lg (56px — design spec default).
 * All buttons use pill border-radius and DM Sans 600 weight.
 * Press animation: scale(0.97) via react-native-reanimated spring.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { shadows, radius } from '../../theme/spacing';
import { lightTap } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      lightTap();
      onPress();
    }
  }, [disabled, loading, onPress]);

  const heights: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };
  const fontSizes: Record<ButtonSize, number> = { sm: 14, md: 15, lg: 16 };

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  /** Non-gradient container styles for secondary, ghost, and danger variants. */
  const containerBase: ViewStyle = {
    height: heights[size],
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 24,
    // Secondary: transparent background + orangeMid border
    ...(isSecondary && {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.orangeMid,
    }),
    // Ghost: no background, no border
    ...(isGhost && {
      backgroundColor: 'transparent',
    }),
    // Danger: solid error fill
    ...(isDanger && { backgroundColor: colors.error }),
  };

  /** Label color per variant. */
  const labelStyle: TextStyle = {
    fontSize: fontSizes[size],
    fontFamily: 'DMSans_600SemiBold',
    fontWeight: '600',
    color:
      isPrimary || isDanger
        ? '#FFFFFF'
        : colors.orangeMid, // secondary & ghost both use orangeMid
  };

  const content = loading ? (
    <ActivityIndicator size="small" color={isPrimary || isDanger ? '#FFFFFF' : colors.orangeMid} />
  ) : (
    <>
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text style={[labelStyle, textStyle]}>{title}</Text>
    </>
  );

  return (
    <AnimatedPressable
      testID={testID}
      style={[animStyle, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={
            disabled
              ? (['#D4B8A0', '#B89878'] as [string, string])
              : colors.gradientCard
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientInner,
            { height: heights[size] },
            !disabled && shadows.glow,
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={containerBase}>{content}</View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  gradientInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: radius.pill,
  },
});
