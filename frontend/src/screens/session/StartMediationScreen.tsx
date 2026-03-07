/**
 * StartMediationScreen — Calming entry point for beginning a new mediation session.
 *
 * Design System: RelateApp_DesignSpec.md §4 "Start Mediation"
 *
 * Layout:
 *   - Full screen with gradientSoft background
 *   - Large Cormorant header: "Something happened."
 *   - Sub: "That's okay. You're both here now."
 *   - Three phase cards (white, with icons) explaining the process
 *   - Primary CTA button: "I'm ready to start"
 *   - Small partner notification note
 *
 * Calls createSession() from sessions service and navigates to Interview.
 * Preserves existing navigation prop types and route params.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { createSession } from '../../services/sessions';
import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

/** Three-phase cards explaining the mediation process */
const PHASES = [
  {
    emoji: '🔒',
    title: 'You share your side',
    description: 'Private. Only you and the AI.',
  },
  {
    emoji: '🔍',
    title: 'We unpack both',
    description: 'No sides. Just truth.',
  },
  {
    emoji: '🤝',
    title: 'You reconnect',
    description: 'Together, with guidance.',
  },
];

export function StartMediationScreen() {
  const navigation = useNavigation<Navigation>();
  const addToast = useUIStore((s) => s.addToast);
  const couple = useAuthStore((s) => s.couple);
  const [loading, setLoading] = useState(false);

  const partnerName = couple?.userB?.name?.split(' ')[0] || 'Your partner';

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const session = await createSession({});
      navigation.replace('Interview', { sessionId: session.id });
    } catch (err: any) {
      const message = err?.response?.data?.message;
      addToast(
        Array.isArray(message) ? message[0] : message || 'Could not start session.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [addToast, navigation]);

  return (
    <LinearGradient
      colors={colors.gradientSoft}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <SafeArea>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ArrowLeft color={colors.textSecondary} size={22} />
          </Pressable>

          {/* Header text */}
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Something happened.</Text>
            <Text style={styles.headerSub}>
              That's okay.{'\n'}You're both here now.
            </Text>
          </View>

          {/* Phase cards */}
          <View style={styles.phasesSection}>
            {PHASES.map((phase, index) => (
              <View key={index} style={styles.phaseCard}>
                <View style={styles.phaseIconWrap}>
                  <Text style={styles.phaseEmoji}>{phase.emoji}</Text>
                </View>
                <View style={styles.phaseTextWrap}>
                  <Text style={styles.phaseTitle}>{phase.title}</Text>
                  <Text style={styles.phaseDesc}>{phase.description}</Text>
                </View>
                {/* Step number */}
                <View style={styles.phaseNumber}>
                  <Text style={styles.phaseNumberText}>{index + 1}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={styles.ctaSection}>
            <Button
              title={loading ? 'Starting...' : "I'm ready to start"}
              onPress={handleStart}
              disabled={loading}
              loading={loading}
              size="lg"
              style={styles.ctaBtn}
            />

            <Text style={styles.partnerNote}>
              {partnerName} will be notified when you begin.
            </Text>
          </View>
        </ScrollView>
      </SafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
  },

  // Back button
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },

  // Header
  headerSection: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  headerSub: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 22,
    lineHeight: 32,
    color: colors.textSecondary,
  },

  // Phase cards
  phasesSection: {
    gap: 14,
    marginBottom: spacing['2xl'],
  },
  phaseCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  phaseIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  phaseEmoji: {
    fontSize: 22,
  },
  phaseTextWrap: {
    flex: 1,
  },
  phaseTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  phaseDesc: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  phaseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  phaseNumberText: {
    fontFamily: fontFamilies.display,
    fontSize: 15,
    color: colors.orangeDeep,
    fontWeight: '600',
  },

  // CTA section
  ctaSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  ctaBtn: {
    width: '100%',
    marginBottom: 16,
  },
  partnerNote: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
