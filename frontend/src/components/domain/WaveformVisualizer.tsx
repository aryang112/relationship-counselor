import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useThemeColors } from '../../theme';

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
  style?: ViewStyle;
}

export function WaveformVisualizer({
  isActive,
  barCount = 24,
  style,
}: WaveformVisualizerProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: barCount }).map((_, i) => (
        <WaveformBar
          key={i}
          index={i}
          isActive={isActive}
          color={colors.primary}
        />
      ))}
    </View>
  );
}

function WaveformBar({
  index,
  isActive,
  color,
}: {
  index: number;
  isActive: boolean;
  color: string;
}) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (isActive) {
      const minH = 4;
      const maxH = 8 + Math.random() * 24;
      const duration = 200 + Math.random() * 300;

      height.value = withDelay(
        index * 30,
        withRepeat(
          withSequence(
            withTiming(maxH, { duration }),
            withTiming(minH, { duration }),
          ),
          -1,
        ),
      );
    } else {
      height.value = withTiming(4, { duration: 300 });
    }
  }, [isActive, height, index]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },
});
