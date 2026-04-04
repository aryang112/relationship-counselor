/**
 * SplashScreen — The opening screen of the Relate app onboarding.
 *
 * Full-screen warm gradient background with the app logo and tagline.
 * Presents two entry points: "Get Started" for new users and
 * "I have a partner code" for users joining an existing couple.
 *
 * Animation: Logo and tagline fade in with a gentle upward slide.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, spacing } from '../../theme';

interface SplashScreenProps {
  onGetStarted: () => void;
  onHaveCode: () => void;
  onSignIn?: () => void;
}

export function SplashScreen({ onGetStarted, onHaveCode, onSignIn }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

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
        <Animated.View entering={FadeIn.duration(600)}>
          <Text style={styles.logo} accessibilityRole="header">relate</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(200)}>
          <Text style={styles.tagline}>finally understand each other</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(600).delay(350)}>
          <Text style={styles.disclaimer}>An AI mediation tool — not a licensed therapist.</Text>
        </Animated.View>
      </View>

      {/* Bottom actions */}
      <Animated.View
        entering={FadeInUp.duration(600).delay(400).springify().damping(15)}
        style={[
          styles.actions,
          { paddingBottom: insets.bottom + spacing.lg },
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
          title="Sign In"
          onPress={onSignIn || onHaveCode}
          variant="ghost"
          textStyle={styles.ghostText}
        />
        <Button
          title="I have a partner code"
          onPress={onHaveCode}
          variant="ghost"
          textStyle={styles.partnerCodeText}
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
  disclaimer: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
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
  partnerCodeText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
});
