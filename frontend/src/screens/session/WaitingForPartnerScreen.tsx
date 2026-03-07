/**
 * WaitingForPartnerScreen — Calming wait state shown while partner completes
 * their interview.
 *
 * Design System: RelateApp_DesignSpec.md §4 "Waiting Screen"
 *
 * Layout:
 *   - Subtle warm gradient background (gradientHero, softened)
 *   - Animated breathing circle in orange (pulsing animation)
 *   - "Breathe. [Partner] is sharing their side."
 *   - Rotating affirmation cards (every 30s)
 *   - ETA indicator: "Usually takes 5-15 minutes"
 *
 * This is a standalone screen navigated to after interview completion
 * when the partner has not yet finished.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { colors, fontFamilies, spacing, radius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

/** Affirmation cards shown on a rotating basis */
const AFFIRMATIONS = [
  'The fact that you started this session means you care.',
  'Conflict is not the enemy. Disconnection is.',
  'You both love each other. That\'s why this hurts.',
  'Vulnerability is the birthplace of connection.',
  'You\'re doing something brave by being here.',
  'Healing starts with the courage to show up.',
];

/** ETA text */
const ETA_TEXT = 'Usually takes 5\u201315 minutes';

export function WaitingForPartnerScreen() {
  const navigation = useNavigation<Navigation>();
  const couple = useAuthStore((s) => s.couple);
  const partnerName = couple?.userB?.name?.split(' ')[0] || 'Your partner';

  // ── Breathing circle animation ──
  const breatheAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.2,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breatheAnim]);

  // ── Rotating affirmation ──
  const [affirmationIndex, setAffirmationIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setAffirmationIndex((prev) => (prev + 1) % AFFIRMATIONS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  // Derive opacity for the glow rings from the breathe animation
  const glowOpacity = breatheAnim.interpolate({
    inputRange: [1, 1.2],
    outputRange: [0.15, 0.35],
  });

  return (
    <LinearGradient
      colors={['#E07832', '#C45A1A', '#6B2A0E']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <SafeArea>
        <View style={styles.container}>
          {/* Back button */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ArrowLeft color="rgba(255,255,255,0.7)" size={22} />
          </Pressable>

          {/* Center content */}
          <View style={styles.centerContent}>
            {/* Breathing circle */}
            <View style={styles.circleContainer}>
              {/* Outer glow ring */}
              <Animated.View
                style={[
                  styles.glowRing,
                  styles.glowRingOuter,
                  {
                    transform: [{ scale: breatheAnim }],
                    opacity: glowOpacity,
                  },
                ]}
              />
              {/* Middle glow ring */}
              <Animated.View
                style={[
                  styles.glowRing,
                  styles.glowRingMiddle,
                  {
                    transform: [{ scale: breatheAnim }],
                    opacity: glowOpacity,
                  },
                ]}
              />
              {/* Core circle */}
              <Animated.View
                style={[
                  styles.coreCircle,
                  {
                    transform: [{ scale: breatheAnim }],
                  },
                ]}
              >
                <Text style={styles.breatheEmoji}>🌬️</Text>
              </Animated.View>
            </View>

            {/* Main text */}
            <Text style={styles.mainText}>
              Breathe.
            </Text>
            <Text style={styles.subText}>
              {partnerName} is sharing their side.
            </Text>

            {/* Affirmation card */}
            <Animated.View style={[styles.affirmationCard, { opacity: fadeAnim }]}>
              <Text style={styles.affirmationText}>
                {AFFIRMATIONS[affirmationIndex]}
              </Text>
            </Animated.View>
          </View>

          {/* ETA at bottom */}
          <View style={styles.etaSection}>
            <Clock color="rgba(255,255,255,0.5)" size={14} />
            <Text style={styles.etaText}>{ETA_TEXT}</Text>
          </View>
        </View>
      </SafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Back button
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
    marginTop: spacing.sm,
  },

  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Breathing circle
  circleContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glowRingOuter: {
    width: 160,
    height: 160,
  },
  glowRingMiddle: {
    width: 130,
    height: 130,
  },
  coreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breatheEmoji: {
    fontSize: 36,
  },

  // Text
  mainText: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 42,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 48,
  },

  // Affirmation card
  affirmationCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 28,
    paddingVertical: 24,
    marginHorizontal: spacing.md,
  },
  affirmationText: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 18,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },

  // ETA
  etaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  etaText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
});
