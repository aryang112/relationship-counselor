/**
 * StartMediationScreen — Calming entry point for beginning a new mediation session.
 *
 * Design System: RelateApp_DesignSpec.md §4 "Start Mediation"
 *
 * Layout:
 *   - Full screen with gradientSoft background
 *   - Agreement signing gate: if current user hasn't signed, shows signing UI
 *   - If current user signed but partner hasn't, shows waiting message
 *   - If both signed, shows normal mediation start flow:
 *     - Large Cormorant header: "Something happened."
 *     - Sub: "That's okay. You're both here now."
 *     - Three phase cards (white, with icons) explaining the process
 *     - Primary CTA button: "I'm ready to start"
 *     - Small partner notification note
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { createSession } from '../../services/sessions';
import { signAgreement } from '../../services/auth';
import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

/** Agreement points the user must accept before starting a session */
const AGREEMENT_POINTS = [
  'I will approach this process with honesty and openness.',
  "I will listen to my partner's perspective with empathy.",
  'I understand my individual responses remain private.',
  'I commit to engaging in the reconnection process in good faith.',
];

/** Three-phase cards explaining the mediation process */
const PHASES = [
  {
    emoji: '\u{1F512}',
    title: 'You share your side',
    description: 'Private. Only you and the AI.',
  },
  {
    emoji: '\u{1F50D}',
    title: 'We unpack both',
    description: 'No sides. Just truth.',
  },
  {
    emoji: '\u{1F91D}',
    title: 'You reconnect',
    description: 'Together, with guidance.',
  },
];

export function StartMediationScreen() {
  const navigation = useNavigation<Navigation>();
  const addToast = useUIStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);
  const couple = useAuthStore((s) => s.couple);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  const partnerName = couple?.userB?.name?.split(' ')[0] || 'Your partner';

  /** Determine agreement signing status */
  const isUserA = user?.id === couple?.userAId;
  const currentUserSigned = isUserA ? !!couple?.userASignedAt : !!couple?.userBSignedAt;
  const partnerSigned = isUserA ? !!couple?.userBSignedAt : !!couple?.userASignedAt;
  const bothSigned = currentUserSigned && partnerSigned;

  /** Handle signing the agreement */
  const handleSign = useCallback(async () => {
    setSigning(true);
    try {
      const updatedCouple = await signAgreement({ confirm: true });
      useAuthStore.getState().setCouple(updatedCouple);
      addToast('Agreement signed!', 'success');
    } catch (err: any) {
      const message = err?.response?.data?.message;
      addToast(
        Array.isArray(message) ? message[0] : message || 'Could not sign agreement.',
        'error',
      );
    } finally {
      setSigning(false);
    }
  }, [addToast]);

  /** Handle starting a mediation session */
  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const session = await createSession({});
      navigation.replace('PreSessionReminder', { sessionId: session.id });
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

  /** Render the agreement signing card when current user hasn't signed */
  const renderSigningCard = () => (
    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
      {/* Header text */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Sign the Agreement First</Text>
        <Text style={styles.headerSub}>
          Both partners must agree to the mediation principles before starting a session.
        </Text>
      </View>

      {/* Agreement card */}
      <View style={styles.agreementCard}>
        <View style={styles.agreementHeader}>
          <ShieldCheck color={colors.orangeMid} size={24} />
          <Text style={styles.agreementHeaderText}>Mediation Principles</Text>
        </View>

        {AGREEMENT_POINTS.map((point, i) => (
          <View key={i} style={styles.agreementPointRow}>
            <View style={styles.agreementBullet}>
              <Text style={styles.agreementBulletText}>{i + 1}</Text>
            </View>
            <Text style={styles.agreementPointText}>{point}</Text>
          </View>
        ))}
      </View>

      {/* Checkbox */}
      <Pressable
        style={styles.checkRow}
        onPress={() => setAgreed(!agreed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: agreed ? colors.orangeMid : colors.border,
              backgroundColor: agreed ? colors.orangeMid : 'transparent',
            },
          ]}
        >
          {agreed && <Text style={styles.checkmark}>{'\u2713'}</Text>}
        </View>
        <Text style={styles.checkLabel}>I agree to all of the above</Text>
      </Pressable>

      {/* Sign button */}
      <Button
        title={signing ? 'Signing...' : 'Sign Agreement'}
        onPress={handleSign}
        disabled={!agreed || signing}
        loading={signing}
        size="lg"
        style={styles.ctaBtn}
      />
    </Animated.View>
  );

  /** Render the waiting message when current user signed but partner hasn't */
  const renderWaitingForPartner = () => (
    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Almost there.</Text>
        <Text style={styles.headerSub}>
          You've signed the agreement.{'\n'}Now waiting for {partnerName}.
        </Text>
      </View>

      <View style={styles.waitingCard}>
        <View style={styles.waitingIconWrap}>
          <Clock color={colors.orangeMid} size={32} />
        </View>
        <Text style={styles.waitingTitle}>
          Waiting for your partner to sign the agreement.
        </Text>
        <Text style={styles.waitingDesc}>
          {partnerName} will need to sign the same mediation principles before you can
          start a session together.
        </Text>

        {/* Signing status indicators */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <CheckCircle2 color={colors.success} size={18} />
            <Text style={styles.statusSigned}>You — Signed</Text>
          </View>
          <View style={styles.statusItem}>
            <Clock color={colors.textMuted} size={18} />
            <Text style={styles.statusPending}>{partnerName} — Pending</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  /** Render the normal mediation start flow when both have signed */
  const renderReadyToStart = () => (
    <>
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
    </>
  );

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

          {/* Conditional content based on agreement signing status */}
          {!currentUserSigned && renderSigningCard()}
          {currentUserSigned && !partnerSigned && renderWaitingForPartner()}
          {bothSigned && renderReadyToStart()}
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
    fontFamily: fontFamilies.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textSecondary,
  },

  // ── Agreement Signing Card ──────────────────────────────────────
  agreementCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 10,
  },
  agreementHeaderText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  agreementPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  agreementBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  agreementBulletText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.orangeDeep,
  },
  agreementPointText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },

  // ── Checkbox ────────────────────────────────────────────────────
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // ── Waiting for Partner ─────────────────────────────────────────
  waitingCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  waitingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  waitingTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  waitingDesc: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statusRow: {
    width: '100%',
    gap: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusSigned: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.success,
  },
  statusPending: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
  },

  // ── Phase cards (normal flow) ───────────────────────────────────
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

  // ── CTA section ─────────────────────────────────────────────────
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
