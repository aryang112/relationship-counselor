import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useThemeColors } from '../../theme';

export function TypingIndicator() {
  const colors = useThemeColors();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 300 }),
            withTiming(0, { duration: 300 }),
          ),
          -1,
        ),
      );
    dot1.value = bounce(0);
    dot2.value = bounce(150);
    dot3.value = bounce(300);
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));
  const style3 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  const dotStyle = { backgroundColor: colors.textMuted };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface2 }]}>
      <Animated.View style={[styles.dot, dotStyle, style1]} />
      <Animated.View style={[styles.dot, dotStyle, style2]} />
      <Animated.View style={[styles.dot, dotStyle, style3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 2,
  },
});
