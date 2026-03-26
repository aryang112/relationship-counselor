/**
 * TypingIndicator — Breathing pulse animation shown when AI is composing a response.
 *
 * Replaces the previous bouncing-dots indicator with a calming breathing circle
 * and concentric ripple rings, matching the Relate app's therapeutic design language.
 *
 * Animation: 3s breathing cycle (1.5s inhale, 1.5s exhale) with staggered rings.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

/** Shared easing for the sine-wave-like breathing rhythm */
const BREATH_EASING = Easing.inOut(Easing.ease);

/** Full breathing cycle: inhale + exhale */
const INHALE_MS = 1500;
const EXHALE_MS = 1500;

/**
 * Creates a looping scale animation that breathes between `min` and `max`,
 * optionally delayed by `delayMs` to stagger concentric rings.
 */
function breatheScale(min: number, max: number, delayMs: number) {
  'worklet';
  return withDelay(
    delayMs,
    withRepeat(
      withSequence(
        withTiming(max, { duration: INHALE_MS, easing: BREATH_EASING }),
        withTiming(min, { duration: EXHALE_MS, easing: BREATH_EASING }),
      ),
      -1,
    ),
  );
}

/**
 * Creates a looping opacity animation that fades between `min` and `max`,
 * synchronized with the breathing scale.
 */
function breatheOpacity(min: number, max: number, delayMs: number) {
  'worklet';
  return withDelay(
    delayMs,
    withRepeat(
      withSequence(
        withTiming(max, { duration: INHALE_MS, easing: BREATH_EASING }),
        withTiming(min, { duration: EXHALE_MS, easing: BREATH_EASING }),
      ),
      -1,
    ),
  );
}

export function TypingIndicator() {
  // ── Scale shared values ───────────────────────────────────
  const centerScale = useSharedValue(0.85);
  const ring1Scale = useSharedValue(0.85);
  const ring2Scale = useSharedValue(0.85);

  // ── Opacity shared values ─────────────────────────────────
  const centerOpacity = useSharedValue(0.6);
  const ring1Opacity = useSharedValue(0.4);
  const ring2Opacity = useSharedValue(0.4);

  useEffect(() => {
    // Center circle: no delay
    centerScale.value = breatheScale(0.85, 1.15, 0);
    centerOpacity.value = breatheOpacity(0.6, 1.0, 0);

    // Ring 1: 200ms delay
    ring1Scale.value = breatheScale(0.85, 1.15, 200);
    ring1Opacity.value = breatheOpacity(0.4, 0.7, 200);

    // Ring 2: 400ms delay
    ring2Scale.value = breatheScale(0.85, 1.15, 400);
    ring2Opacity.value = breatheOpacity(0.4, 0.7, 400);
  }, [centerScale, centerOpacity, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity]);

  // ── Animated styles ───────────────────────────────────────
  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
    opacity: centerOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Breathing pulse area */}
      <View style={styles.pulseArea}>
        {/* Outer ripple ring (48x48) */}
        <Animated.View style={[styles.ring2, ring2Style]} />

        {/* Inner ripple ring (36x36) */}
        <Animated.View style={[styles.ring1, ring1Style]} />

        {/* Center circle (24x24) */}
        <Animated.View style={[styles.center, centerStyle]} />
      </View>

      {/* "relate" label beneath the circle */}
      <Text style={styles.relateLabel}>relate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 56,
    backgroundColor: colors.surface2,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },

  /** Centered area that holds the overlapping circle + rings */
  pulseArea: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /** Center breathing circle — 24x24 solid fill */
  center: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.orangeLight, // #F0A060
  },

  /** First ripple ring — 36x36 border only */
  ring1: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.orangeGlow, // #F5C49A
  },

  /** Second (outermost) ripple ring — 48x48 border only */
  ring2: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.orangeTint, // #FBE8D8
  },

  /** "relate" branding label, matching ChatBubble's relateLabel style */
  relateLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.orangeMid, // #E07832
    marginTop: -6,
  },
});
