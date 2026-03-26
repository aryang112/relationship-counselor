/**
 * EmotionPill — Toggleable pill chip for emotion/feeling selection.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "EmotionPill"
 *
 * Default state:
 *   - Background: orangeTint (#FBE8D8)
 *   - Border: 1px solid orangeGlow (#F5C49A)
 *   - Text: orangeDeep (#C45A1A), 13px, DM Sans weight 500
 *
 * Selected state:
 *   - Background: orangeMid (#E07832) solid fill
 *   - Border: 1px solid orangeMid
 *   - Text: white (#FFFFFF)
 *
 * Height: ~36px, border-radius: pill (999).
 * Includes emoji + label display.
 *
 * Used on InterviewScreen for feeling/emotion selection.
 */

import React, { useCallback } from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';
import { lightTap } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EmotionPillProps {
  emoji: string;
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function EmotionPill({
  emoji,
  label,
  selected = false,
  onPress,
  style,
}: EmotionPillProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    lightTap();
    scale.value = withSpring(1.08, { damping: 12, stiffness: 200 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    }, 100);
    onPress?.();
  }, [onPress, scale]);

  return (
    <AnimatedPressable
      style={[
        styles.pill,
        selected ? styles.pillSelected : styles.pillDefault,
        style,
        animatedStyle,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${emoji} ${label}`}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text
        style={[
          styles.label,
          { color: selected ? '#FFFFFF' : colors.orangeDeep },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  pillDefault: {
    backgroundColor: colors.orangeTint,
    borderColor: colors.orangeGlow,
  },
  pillSelected: {
    backgroundColor: colors.orangeMid,
    borderColor: colors.orangeMid,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    fontWeight: '500',
  },
});
