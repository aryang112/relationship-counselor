/**
 * SplashScreen — The opening screen of the Relate app onboarding.
 *
 * Full-screen warm gradient background with the app logo and tagline.
 * Presents two entry points: "Get Started" for new users and
 * "I have a partner code" for users joining an existing couple.
 *
 * Animation: Logo and tagline fade in with a gentle upward slide.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, spacing } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onGetStarted: () => void;
  onHaveCode: () => void;
}

export function SplashScreen({ onGetStarted, onHaveCode }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(16);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(24);

  useEffect(() => {
    // Logo fades in first
    logoOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
    logoTranslateY.value = withDelay(
      400,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );

    // Tagline follows
    taglineOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    taglineTranslateY.value = withDelay(
      900,
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    // Buttons last
    buttonsOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
    buttonsTranslateY.value = withDelay(
      1400,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  return (
    <LinearGradient
      colors={colors.gradientHero}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={styles.container}
    >
      {/* Subtle grain/overlay effect */}
      <View style={styles.overlay} />

      {/* Center content */}
      <View style={styles.centerContent}>
        <Animated.View style={logoStyle}>
          <Text style={styles.logo}>relate</Text>
        </Animated.View>

        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>finally understand each other</Text>
        </Animated.View>
      </View>

      {/* Bottom actions */}
      <Animated.View
        style={[
          styles.actions,
          { paddingBottom: insets.bottom + spacing.lg },
          buttonsStyle,
        ]}
      >
        <Button
          title="Get Started"
          onPress={onGetStarted}
          variant="primary"
          size="lg"
          style={styles.getStartedBtn}
          textStyle={styles.getStartedText}
        />
        <Button
          title="I have a partner code"
          onPress={onHaveCode}
          variant="ghost"
          textStyle={styles.ghostText}
        />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 52,
    color: colors.textInverse,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: fontFamilies.body,
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.sm,
  },
  actions: {
    paddingHorizontal: spacing.lg,
  },
  getStartedBtn: {
    marginBottom: spacing.md,
  },
  getStartedText: {
    fontSize: 17,
  },
  ghostText: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
