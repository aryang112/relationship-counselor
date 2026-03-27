/**
 * BottomSheet — Modal sheet that slides up from the bottom edge.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "BottomSheet"
 *
 * Background: bgElevated (#FFFFFF) — clean white.
 * Border-radius: lg (24px) on top corners.
 * Handle: warm border color (#E8DDD4), 36x4px pill.
 * Overlay: rgba(0,0,0,0.5) — standard modal overlay.
 * Shadow: large warm shadow on the sheet itself.
 *
 * Animation: Spring-based slide-up via react-native-reanimated.
 * Max height: 85% of screen to avoid covering status bar.
 */

import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 200 });
    }
  }, [visible, opacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: visible ? ('auto' as const) : ('none' as const),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleBackdropPress = () => {
    onClose();
  };

  return (
    <>
      <AnimatedPressable
        style={[styles.backdrop, backdropStyle]}
        onPress={handleBackdropPress}
      />
      <Animated.View
        style={[
          styles.sheet,
          shadows.lg,
          sheetStyle,
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.handle} />
          <View style={styles.content}>{children}</View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    zIndex: 100,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 101,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
});
