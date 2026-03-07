import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useThemeColors } from '../../theme';
import { mediumTap, heavyTap } from '../../utils/haptics';

interface VoiceRecorderButtonProps {
  isRecording: boolean;
  onPressStart: () => void;
  onPressStop: () => void;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VoiceRecorderButton({
  isRecording,
  onPressStart,
  onPressStop,
  disabled = false,
}: VoiceRecorderButtonProps) {
  const colors = useThemeColors();
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(withTiming(1.4, { duration: 1000 }), -1, true);
      pulseOpacity.value = withRepeat(withTiming(0, { duration: 1000 }), -1, true);
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [isRecording, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePress = useCallback(() => {
    if (isRecording) {
      heavyTap();
      onPressStop();
    } else {
      mediumTap();
      onPressStart();
    }
  }, [isRecording, onPressStart, onPressStop]);

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.pulse,
          { backgroundColor: colors.error },
          pulseStyle,
        ]}
      />
      <AnimatedPressable
        style={[
          styles.button,
          {
            backgroundColor: isRecording ? colors.error : colors.primary,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <View
          style={
            isRecording
              ? [styles.stopIcon, { backgroundColor: '#FFFFFF' }]
              : [styles.micIcon, { borderColor: '#FFFFFF' }]
          }
        />
        <Text style={styles.label}>
          {isRecording ? 'Stop' : 'Record'}
        </Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  micIcon: {
    width: 16,
    height: 24,
    borderRadius: 8,
    borderWidth: 3,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
