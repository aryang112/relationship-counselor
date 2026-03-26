/**
 * AIConsentModal — Apple 5.1.2(i) compliant AI data processing consent.
 *
 * Displayed before a user's first mediation session. Explains that session
 * content is processed by Anthropic's Claude AI, what data is shared, and
 * why. User must check a confirmation checkbox before the "I Understand
 * and Agree" button becomes active.
 *
 * Follows CrisisResourcesModal pattern: Modal, pageSheet, lucide icons.
 *
 * Props:
 *   visible   — controls modal visibility
 *   onAgree   — called when user consents
 *   onDecline — called when user taps "Not Now"
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Brain, Lock, Shield, CheckSquare, Square } from 'lucide-react-native';
import { colors, fontFamilies, spacing, radius, shadows } from '../../theme';

interface AIConsentModalProps {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function InfoCard({ icon, title, body }: InfoCardProps) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardIcon}>{icon}</View>
      <View style={styles.infoCardText}>
        <Text style={styles.infoCardTitle}>{title}</Text>
        <Text style={styles.infoCardBody}>{body}</Text>
      </View>
    </View>
  );
}

export function AIConsentModal({ visible, onAgree, onDecline }: AIConsentModalProps) {
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);

  const handleAgree = () => {
    if (!checked) return;
    setChecked(false);
    onAgree();
  };

  const handleDecline = () => {
    setChecked(false);
    onDecline();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleDecline}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top || spacing.lg,
            paddingBottom: insets.bottom || spacing.lg,
          },
        ]}
      >
        {/* Close button */}
        <Pressable
          onPress={handleDecline}
          style={styles.closeBtn}
          accessibilityLabel="Close"
          accessibilityRole="button"
          hitSlop={12}
        >
          <X size={24} color={colors.textSecondary} />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.title}>How AI Powers Your Sessions</Text>
          <Text style={styles.subtitle}>
            Relate uses Anthropic's Claude AI to help you and your partner
            understand each other better. Here's what that means for your data:
          </Text>

          {/* Info cards */}
          <View style={styles.cardsList}>
            <InfoCard
              icon={<Brain color={colors.orangeMid} size={22} />}
              title="What gets shared with AI"
              body="The thoughts and feelings you share during sessions are sent to Anthropic's Claude to generate insights and help find common ground between you and your partner."
            />
            <InfoCard
              icon={<Lock color={colors.orangeMid} size={22} />}
              title="Your data stays private"
              body="Your session content is sent via encrypted API calls. Anthropic does not use your data to train their AI models. Your partner never sees your raw words."
            />
            <InfoCard
              icon={<Shield color={colors.orangeMid} size={22} />}
              title="You're always in control"
              body="You can delete your account and all associated data at any time from Settings. Session transcripts are automatically deleted after 90 days."
            />
          </View>

          {/* Checkbox */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setChecked(!checked)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            {checked ? (
              <CheckSquare color={colors.orangeMid} size={24} />
            ) : (
              <Square color={colors.textMuted} size={24} />
            )}
            <Text style={styles.checkboxLabel}>
              I understand my session content is processed by Anthropic's AI
            </Text>
          </Pressable>

          {/* Agree button */}
          <Pressable
            style={[
              styles.agreeBtn,
              !checked && styles.agreeBtnDisabled,
            ]}
            onPress={handleAgree}
            disabled={!checked}
            accessibilityRole="button"
            accessibilityLabel="I Understand and Agree"
          >
            <Text
              style={[
                styles.agreeBtnText,
                !checked && styles.agreeBtnTextDisabled,
              ]}
            >
              I Understand and Agree
            </Text>
          </Pressable>

          {/* Not Now */}
          <Pressable
            style={styles.declineBtn}
            onPress={handleDecline}
            accessibilityRole="button"
            accessibilityLabel="Not Now"
          >
            <Text style={styles.declineBtnText}>Not Now</Text>
          </Pressable>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            Relate is not a therapist or mental health service. If you need
            immediate help, please contact a crisis resource.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },

  // Header
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  // Info cards
  cardsList: {
    gap: 12,
    marginBottom: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...shadows.card,
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoCardText: {
    flex: 1,
  },
  infoCardTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  infoCardBody: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },

  // Agree button
  agreeBtn: {
    backgroundColor: colors.orangeMid,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  agreeBtnDisabled: {
    backgroundColor: colors.bgSecondary,
  },
  agreeBtnText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  agreeBtnTextDisabled: {
    color: colors.textMuted,
  },

  // Decline button
  declineBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  declineBtnText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textMuted,
  },

  // Disclaimer
  disclaimer: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
