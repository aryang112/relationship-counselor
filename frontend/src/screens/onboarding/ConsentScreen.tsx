/**
 * ConsentScreen — Clickwrap legal consent screen shown during onboarding.
 *
 * Displays four key assurances (privacy, AI disclaimer, data policy, age
 * requirement), links to full Terms of Service and Privacy Policy via
 * LegalDocumentModal, and requires the user to check a consent checkbox
 * before proceeding. On continue, records consent via the backend API.
 *
 * Placed between the Promise screen and YourName screen in the onboarding flow.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Lock, Handshake, ShieldOff, AlertCircle } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { LegalDocumentModal } from '../../components/domain/LegalDocumentModal';
import { colors, fontFamilies, typography, spacing, radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { recordConsent } from '../../services/auth';

interface ConsentScreenProps {
  onContinue: () => void;
  onBack: () => void;
}

/** The four assurance items displayed in the body of the consent screen. */
const ASSURANCE_ITEMS = [
  {
    icon: Lock,
    title: 'Your private vents stay completely private.',
    partnerAware: true, // Will insert partner name dynamically
    description: ' will never see your raw words.',
  },
  {
    icon: Handshake,
    title: 'Relate is a support tool, not therapy.',
    partnerAware: false,
    description: 'Our AI is not a licensed counselor or mediator.',
  },
  {
    icon: ShieldOff,
    title: 'We never sell your data. Ever.',
    partnerAware: false,
    description: 'Your relationship stays between you two and us.',
  },
  {
    icon: AlertCircle,
    title: 'You must be 18 or older to use Relate.',
    partnerAware: false,
    description: '',
  },
];

export function ConsentScreen({ onContinue, onBack }: ConsentScreenProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(
    null,
  );

  const partnerName = useOnboardingStore((s) => s.partnerName) || 'Your partner';

  const handleContinue = useCallback(async () => {
    if (!agreed) return;

    setLoading(true);
    try {
      await recordConsent({
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      onContinue();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Could not record consent. Please try again.';
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  }, [agreed, onContinue]);

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Container>
          {/* Header */}
          <Text style={styles.headline}>Before we get started.</Text>
          <Text style={styles.subheadline}>
            A few things to know so this feels safe for both of you.
          </Text>

          {/* Assurance Items */}
          <View style={styles.assuranceList}>
            {ASSURANCE_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const descriptionText = item.partnerAware
                ? `${partnerName}${item.description}`
                : item.description;

              return (
                <View key={index} style={styles.assuranceRow}>
                  <View style={styles.iconContainer}>
                    <Icon size={22} color={colors.orangeMid} />
                  </View>
                  <View style={styles.assuranceContent}>
                    <Text style={styles.assuranceTitle}>{item.title}</Text>
                    {descriptionText ? (
                      <Text style={styles.assuranceDescription}>
                        {descriptionText}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Legal Document Links */}
          <View style={styles.linksContainer}>
            <Pressable
              onPress={() => setLegalModal('terms')}
              accessibilityRole="link"
              accessibilityLabel="Read our full Terms of Service"
            >
              <Text style={styles.linkText}>
                Read our full Terms of Service
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLegalModal('privacy')}
              accessibilityRole="link"
              accessibilityLabel="Read our Privacy Policy"
              style={{ marginTop: spacing.sm }}
            >
              <Text style={styles.linkText}>Read our Privacy Policy</Text>
            </Pressable>
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
            <Text style={styles.checkLabel}>
              I've read and agree to the Terms of Service and Privacy Policy. I
              understand Relate is not a therapy or crisis service.
            </Text>
          </Pressable>

          {/* CTA Button */}
          <Button
            title="I Understand, Let's Go"
            onPress={handleContinue}
            disabled={!agreed}
            loading={loading}
            size="lg"
            style={styles.ctaButton}
          />

          {/* Safety Disclaimer */}
          <Text style={styles.disclaimer}>
            If you or your partner are in an unsafe situation, please contact a
            professional. Relate is not equipped to handle emergencies.
          </Text>
        </Container>
      </ScrollView>

      {/* Legal Document Modal */}
      <LegalDocumentModal
        visible={legalModal !== null}
        onClose={() => setLegalModal(null)}
        documentType={legalModal || 'terms'}
      />
    </SafeArea>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  headline: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subheadline: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  assuranceList: {
    marginBottom: spacing.lg,
  },
  assuranceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  assuranceContent: {
    flex: 1,
    paddingTop: 2,
  },
  assuranceTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  assuranceDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  linksContainer: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.orangeMid,
    textDecorationLine: 'underline',
    lineHeight: 22,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
    flexShrink: 0,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
  },
  ctaButton: {
    marginBottom: spacing.md,
  },
  disclaimer: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
