/**
 * WelcomeScreen — Landing page for unauthenticated users.
 *
 * Design System: RelateApp_DesignSpec.md §3 "Welcome/Auth"
 *
 * Layout:
 *   - Warm gradient background (gradientHero)
 *   - "relate" logo in Cormorant italic
 *   - "finally understand each other" tagline
 *   - Login (primary) + Register (secondary/ghost) buttons
 *   - Light warm theme
 *
 * Animations:
 *   - Logo fades in + slides up (100ms delay)
 *   - Tagline section fades in (350ms delay)
 *   - CTAs fade in (600ms delay)
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
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function WelcomeScreen({ onLogin, onRegister }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  // Staggered fade-in values
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(24);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(20);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(20);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600, easing }));
    logoY.value = withDelay(100, withTiming(0, { duration: 600, easing }));
    textOpacity.value = withDelay(350, withTiming(1, { duration: 600, easing }));
    textY.value = withDelay(350, withTiming(0, { duration: 600, easing }));
    ctaOpacity.value = withDelay(600, withTiming(1, { duration: 600, easing }));
    ctaY.value = withDelay(600, withTiming(0, { duration: 600, easing }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  return (
    <LinearGradient
      colors={colors.gradientHero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>

        {/* Logo mark */}
        <Animated.View style={[styles.logoSection, logoStyle]}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconGlyph}>&#x2726;</Text>
          </View>
        </Animated.View>

        {/* Headline + tagline */}
        <Animated.View style={[styles.textSection, textStyle]}>
          <Text style={styles.appName}>relate</Text>
          <Text style={styles.tagline}>
            finally understand{'\n'}each other
          </Text>

          {/* Decorative divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerDot}>&#x2726;</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.trustLine}>
            Private {'\u00B7'} Empathetic {'\u00B7'} AI-guided
          </Text>
        </Animated.View>

        {/* CTAs */}
        <Animated.View style={[styles.ctaSection, ctaStyle]}>
          <Button
            title="Log In"
            onPress={onLogin}
            style={styles.loginBtn}
            textStyle={styles.loginBtnText}
          />
          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>New here? </Text>
            <Text style={styles.signupLink} onPress={onRegister}>
              Create an account
            </Text>
          </View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },

  // Logo
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  iconGlyph: {
    fontSize: 44,
    color: '#FFFFFF',
  },

  // Text
  textSection: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontFamily: fontFamilies.displayItalic || fontFamilies.display,
    fontSize: 56,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 60,
    letterSpacing: -1,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  tagline: {
    fontFamily: fontFamilies.body,
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 28,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    width: 180,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerDot: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  trustLine: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // CTAs
  ctaSection: {
    width: '100%',
    paddingBottom: 12,
    alignItems: 'center',
    gap: 16,
  },
  loginBtn: {
    width: '100%',
  },
  loginBtnText: {
    // Button text is already white on primary, which works on the gradient bg
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  signupPrompt: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  signupLink: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
