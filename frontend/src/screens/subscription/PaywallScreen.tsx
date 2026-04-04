/**
 * PaywallScreen — Single-screen paywall with side-by-side plan cards.
 *
 * Layout (no scroll, fits one screen):
 *   - Hero illustration: animated hearts/couple icon
 *   - Headline + subtitle
 *   - Side-by-side plan cards (Annual | Monthly)
 *   - CTA button
 *   - Footer: skip, restore, legal links
 *
 * Design: Inspired by Calm/Headspace paywalls — minimal, warm, trust-building.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
} from 'lucide-react-native';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { LegalDocumentModal } from '../../components/domain/LegalDocumentModal';
import { useSubscription } from '../../hooks/useSubscription';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { PRODUCT_IDS, PRICING } from '../../types/subscription';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - 12) / 2;

const FEATURES = [
  'Unlimited mediation sessions',
  'Deeper AI insights',
  'Relationship growth tracking',
];

interface PaywallScreenProps {
  onSkip?: () => void;
  onPurchased?: () => void;
}

/**
 * SVG illustration of a couple embracing — minimal, warm silhouette style.
 * Two figures leaning into each other with a small heart above.
 * Animated with a gentle breathing scale and a warm glow behind.
 */
function CoupleIllustration() {
  const breathe = useSharedValue(1);
  const glowOpacity = useSharedValue(0.25);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withDelay(300, withTiming(0.5, { duration: 2500 })),
        withTiming(0.25, { duration: 2500 }),
      ),
      -1,
      true,
    );
  }, []);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={heroStyles.container}>
      <Animated.View style={[heroStyles.glow, glowStyle]} />
      <Animated.View style={breatheStyle}>
        <Svg width={140} height={130} viewBox="0 0 140 130">
          <Defs>
            <RadialGradient id="warmGlow" cx="50%" cy="60%" r="50%">
              <Stop offset="0%" stopColor={colors.orangeLight} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.orangeLight} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Warm glow behind couple */}
          <Circle cx="70" cy="75" r="55" fill="url(#warmGlow)" />

          {/* Person A (left) — leaning right */}
          <G>
            {/* Head */}
            <Circle cx="52" cy="42" r="14" fill={colors.orangeMid} />
            {/* Body — curved torso leaning into partner */}
            <Path
              d="M38 56 C36 70, 34 90, 36 110 L50 110 C52 95, 48 78, 52 62 Z"
              fill={colors.orangeMid}
            />
            {/* Arm reaching around partner */}
            <Path
              d="M52 62 C58 68, 68 72, 78 70"
              stroke={colors.orangeMid}
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
          </G>

          {/* Person B (right) — leaning left */}
          <G>
            {/* Head */}
            <Circle cx="88" cy="38" r="14" fill={colors.orangeDeep} />
            {/* Body */}
            <Path
              d="M102 52 C104 66, 106 86, 104 110 L90 110 C88 91, 92 74, 88 58 Z"
              fill={colors.orangeDeep}
            />
            {/* Arm reaching around partner */}
            <Path
              d="M88 58 C82 64, 72 68, 62 66"
              stroke={colors.orangeDeep}
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
          </G>

          {/* Small heart between them */}
          <Path
            d="M70 22 C70 18, 65 14, 62 18 C59 22, 62 26, 70 32 C78 26, 81 22, 78 18 C75 14, 70 18, 70 22 Z"
            fill={colors.orangeLight}
            opacity="0.8"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 130,
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.orangeTint,
  },
});

export function PaywallScreen({ onSkip, onPurchased }: PaywallScreenProps = {}) {
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const addToast = useUIStore((s) => s.addToast);
  const { purchaseSubscription, restorePurchases } = useSubscription();
  const isOnboarding = !!onSkip;

  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const isAnyLoading = purchaseLoading || restoreLoading;

  const handlePurchase = async () => {
    setPurchaseLoading(true);
    const productId = selectedPlan === 'annual' ? PRODUCT_IDS.PREMIUM_ANNUAL : PRODUCT_IDS.PREMIUM_MONTHLY;
    try {
      const success = await purchaseSubscription(productId);
      if (success) {
        addToast('Welcome to Premium!', 'success');
        onPurchased ? onPurchased() : navigation.goBack();
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        addToast('Purchases restored!', 'success');
        onPurchased ? onPurchased() : navigation.goBack();
      } else {
        addToast('No purchases to restore.', 'info');
      }
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      {/* Close / Back */}
      {!isOnboarding && (
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      )}

      {/* Hero — couple embracing illustration */}
      <Animated.View entering={FadeIn.duration(600)}>
        <CoupleIllustration />
      </Animated.View>

      {/* Headline */}
      <Animated.View entering={FadeIn.duration(500).delay(100)} style={styles.headerSection}>
        <Text style={styles.headline}>
          {isOnboarding ? 'Invest in your\nrelationship' : 'Keep growing\ntogether'}
        </Text>
        <Text style={styles.subtitle}>
          Unlimited sessions. Deeper insights. Real change.
        </Text>
      </Animated.View>

      {/* Features */}
      <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.featureList}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={16} color={colors.orangeMid} strokeWidth={3} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Side-by-side plan cards */}
      <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.planRow}>
        {/* Annual */}
        <Pressable
          onPress={() => setSelectedPlan('annual')}
          style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedPlan === 'annual' }}
        >
          {selectedPlan === 'annual' && (
            <LinearGradient
              colors={colors.gradientCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.selectedTopBar}
            />
          )}
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </View>
          <Text style={styles.planTitle}>Annual</Text>
          <Text style={styles.planPrice}>$99.99</Text>
          <Text style={styles.planUnit}>/year</Text>
          <View style={styles.planDivider} />
          <Text style={styles.planBreakdown}>$8.33/mo</Text>
          <Text style={styles.planSave}>Save 44%</Text>
        </Pressable>

        {/* Monthly */}
        <Pressable
          onPress={() => setSelectedPlan('monthly')}
          style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedPlan === 'monthly' }}
        >
          {selectedPlan === 'monthly' && (
            <LinearGradient
              colors={colors.gradientCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.selectedTopBar}
            />
          )}
          <View style={styles.bestValueBadgePlaceholder} />
          <Text style={styles.planTitle}>Monthly</Text>
          <Text style={styles.planPrice}>$14.99</Text>
          <Text style={styles.planUnit}>/month</Text>
          <View style={styles.planDivider} />
          <Text style={styles.planBreakdown}>Billed monthly</Text>
        </Pressable>
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.ctaSection}>
        <Button
          title={purchaseLoading ? 'Processing...' : 'Start Premium'}
          onPress={handlePurchase}
          disabled={isAnyLoading}
          loading={purchaseLoading}
          size="lg"
          style={styles.ctaBtn}
          accessibilityLabel="Start Premium subscription"
        />
        <Text style={styles.renewNote}>
          Auto-renews. Cancel anytime.
        </Text>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        {isOnboarding && (
          <Pressable
            onPress={onSkip}
            disabled={isAnyLoading}
            accessibilityLabel="Continue with free plan"
            accessibilityRole="button"
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>Start free with 2 sessions</Text>
          </Pressable>
        )}

        <View style={styles.footerLinks}>
          <Pressable
            onPress={handleRestore}
            disabled={isAnyLoading}
            accessibilityLabel="Restore purchases"
            accessibilityRole="button"
          >
            {restoreLoading ? (
              <ActivityIndicator size="small" color={colors.orangeMid} />
            ) : (
              <Text style={styles.footerLink}>Restore</Text>
            )}
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => setLegalDoc('terms')} hitSlop={8}>
            <Text style={styles.footerLink}>Terms</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => setLegalDoc('privacy')} hitSlop={8}>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
        </View>
      </View>

      <LegalDocumentModal
        visible={legalDoc !== null}
        onClose={() => setLegalDoc(null)}
        documentType={legalDoc ?? 'terms'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },

  // Close button
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    fontSize: 22,
    color: colors.textMuted,
    lineHeight: 24,
  },

  // Header
  headerSection: {
    alignItems: 'center',
  },
  headline: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Features
  featureList: {
    gap: 10,
    paddingHorizontal: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // Plan cards — side by side
  planRow: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.orangeMid,
    backgroundColor: '#FFFAF5',
  },
  selectedTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  bestValueBadge: {
    backgroundColor: colors.orangeMid,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  bestValueText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 1.5,
  },
  bestValueBadgePlaceholder: {
    height: 22,
    marginBottom: 8,
  },
  planTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  planPrice: {
    fontFamily: fontFamilies.display,
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  planUnit: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  planDivider: {
    width: '60%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  planBreakdown: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  planSave: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginTop: 4,
  },

  // CTA
  ctaSection: {
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
  },
  renewNote: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 10,
  },
  skipBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  footerDot: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
  },
});
