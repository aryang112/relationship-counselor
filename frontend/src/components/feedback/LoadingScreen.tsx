/**
 * LoadingScreen — Full-screen loading state with pulsing orange dot.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "LoadingScreen"
 *
 * Background: bgPrimary (#FAF7F4) — warm off-white.
 * Indicator: Pulsing orange dot (orangeMid #E07832) instead of spinner.
 *   - 12px diameter circle.
 *   - Infinite pulse animation: scale 1 -> 1.4 -> 1, opacity 0.4 -> 1 -> 0.4.
 *   - 1200ms cycle.
 *
 * Optional message text below the dot in textSecondary.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1, // infinite
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 600 }),
      ),
      -1,
    );
  }, [scale, opacity]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, dotStyle]} />
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.orangeMid,
  },
  message: {
    marginTop: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
