/**
 * LegalDocumentModal — Full-screen modal displaying Terms of Service or Privacy Policy.
 *
 * Renders the legal text as native Text components inside a scrollable view.
 * Used by ConsentScreen to let users review the full legal documents before
 * agreeing to them.
 *
 * Props:
 *   visible       — controls modal visibility
 *   onClose       — callback to dismiss the modal
 *   documentType  — 'terms' for Terms of Service, 'privacy' for Privacy Policy
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, fontFamilies, typography, spacing } from '../../theme';

interface LegalDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  documentType: 'terms' | 'privacy';
}

/* ─── Terms of Service Content ─────────────────────────────────────── */

function TermsOfServiceContent() {
  return (
    <>
      <Text style={styles.meta}>Last updated: March 12, 2026</Text>
      <Text style={styles.meta}>Version: 1.0.0</Text>

      <Text style={styles.sectionHeading}>What Relate Is (and Isn't)</Text>
      <Text style={styles.bodyText}>
        Relate is an AI-powered relationship support tool designed to help
        couples communicate more effectively. Relate is not therapy, counseling,
        or a substitute for professional mental health services. Our AI mediator
        is not a licensed therapist, psychologist, or counselor. If you or your
        partner are experiencing a mental health crisis, domestic violence, or
        any situation requiring professional intervention, please contact a
        qualified professional or emergency services immediately.
      </Text>

      <Text style={styles.sectionHeading}>Who Can Use Relate</Text>
      <Text style={styles.bodyText}>
        You must be at least 18 years old to use Relate. By creating an account,
        you represent and warrant that you are at least 18 years of age. Relate
        is designed for use by two consenting adults in a relationship. Both
        partners must create their own accounts and voluntarily agree to
        participate.
      </Text>

      <Text style={styles.sectionHeading}>Safety</Text>
      <Text style={styles.bodyText}>
        Relate is not designed for or equipped to handle situations involving
        domestic violence, abuse, self-harm, or any form of crisis. If you or
        your partner are in an unsafe situation, please contact the National
        Domestic Violence Hotline (1-800-799-7233), Crisis Text Line (text HOME
        to 741741), or your local emergency services (911). We reserve the right
        to suspend or terminate accounts if we detect content that suggests
        immediate danger to any person.
      </Text>

      <Text style={styles.sectionHeading}>About Our AI</Text>
      <Text style={styles.bodyText}>
        Relate uses artificial intelligence to facilitate communication between
        partners. The AI analyzes what each partner shares to identify common
        ground, reframe perspectives, and suggest constructive approaches. The AI
        is not perfect and may occasionally misinterpret context or nuance. It
        does not have the ability to diagnose mental health conditions, provide
        medical advice, or replace human judgment. You should always use your own
        judgment when considering the AI's suggestions.
      </Text>

      <Text style={styles.sectionHeading}>Both Partners Must Consent</Text>
      <Text style={styles.bodyText}>
        Relate requires both partners to independently agree to these Terms of
        Service and our Privacy Policy before any mediation session can begin.
        Each partner's private vents and individual responses are never shared
        with the other partner in their raw form. The AI synthesizes both
        perspectives into neutral, constructive summaries. Either partner may
        withdraw their consent and delete their account at any time.
      </Text>

      <Text style={styles.sectionHeading}>Limitation of Liability</Text>
      <Text style={styles.bodyText}>
        Relate is provided "as is" without warranties of any kind, whether
        express or implied. We do not guarantee that the service will improve
        your relationship or resolve any specific conflict. To the maximum extent
        permitted by law, Relate and its affiliates shall not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or
        any loss of profits or revenues, whether incurred directly or
        indirectly, or any loss of data, use, goodwill, or other intangible
        losses resulting from your use of the service.
      </Text>

      <Text style={styles.sectionHeading}>Account Termination</Text>
      <Text style={styles.bodyText}>
        You may delete your account at any time through the app settings. Upon
        deletion, your personal data will be permanently removed in accordance
        with our Privacy Policy. We reserve the right to suspend or terminate
        accounts that violate these terms, engage in abusive behavior toward
        other users, or use the service in ways that could cause harm. If one
        partner deletes their account, the couple's shared session data will be
        anonymized and the remaining partner will be notified.
      </Text>
    </>
  );
}

/* ─── Privacy Policy Content ───────────────────────────────────────── */

function PrivacyPolicyContent() {
  return (
    <>
      <Text style={styles.meta}>Last updated: March 12, 2026</Text>
      <Text style={styles.meta}>Version: 1.0.0</Text>

      <Text style={styles.sectionHeading}>What We Collect</Text>
      <Text style={styles.bodyText}>
        We collect the information you provide when creating your account (email
        address, name, and gender), your onboarding responses (communication
        style, relationship story, conflict preferences), and the content you
        share during mediation sessions (vents, responses, and feedback). We also
        collect basic device information (operating system, app version) and
        usage analytics (session frequency, feature usage) to improve the
        service. We do not collect location data, contacts, photos, or any other
        data from your device.
      </Text>

      <Text style={styles.sectionHeading}>Your Private Vents</Text>
      <Text style={styles.bodyText}>
        When you share your perspective during a mediation session, your raw
        words are never shown to your partner. The AI reads both partners'
        inputs and synthesizes them into neutral, constructive summaries. Your
        original vent text is stored encrypted and is only accessible to you and
        our AI processing systems. Your partner will never see your exact words
        — only the AI-generated synthesis that represents both perspectives
        fairly.
      </Text>

      <Text style={styles.sectionHeading}>Data Sharing</Text>
      <Text style={styles.bodyText}>
        We do not sell, rent, or trade your personal information to third
        parties. Ever. We share data only with: (1) our AI processing provider
        (OpenAI) to generate mediation responses — this data is sent via
        encrypted API calls and is not used to train their models; (2) our
        infrastructure providers (cloud hosting, database) who are contractually
        bound to protect your data; (3) as required by law (see The Subpoena
        Clause below).
      </Text>

      <Text style={styles.sectionHeading}>The Subpoena Clause</Text>
      <Text style={styles.bodyText}>
        We will comply with valid legal processes, including subpoenas and court
        orders. If we receive a legal request for your data, we will notify you
        before disclosing any information unless we are legally prohibited from
        doing so. We will challenge overly broad requests and will only provide
        the minimum data required by law. We strongly recommend that you do not
        share information through Relate that you would not want disclosed in
        legal proceedings, particularly in family court or divorce cases.
      </Text>

      <Text style={styles.sectionHeading}>Data Retention</Text>
      <Text style={styles.bodyText}>
        Active account data is retained for as long as your account exists. When
        you delete your account, your personal data is permanently deleted
        within 30 days. Anonymized, aggregated data (which cannot be linked back
        to you) may be retained indefinitely for service improvement. Session
        transcripts are automatically deleted 90 days after a session ends
        unless you explicitly choose to keep them. Backup copies are purged
        within 30 days of the primary deletion.
      </Text>

      <Text style={styles.sectionHeading}>Children</Text>
      <Text style={styles.bodyText}>
        Relate is not intended for use by anyone under the age of 18. We do not
        knowingly collect personal information from children. If we learn that
        we have collected personal information from a child under 18, we will
        take steps to delete that information as quickly as possible. If you
        believe a child under 18 has provided us with personal information,
        please contact us immediately.
      </Text>

      <Text style={styles.sectionHeading}>Your Rights (GDPR)</Text>
      <Text style={styles.bodyText}>
        If you are located in the European Economic Area (EEA), United Kingdom,
        or other jurisdictions with similar data protection laws, you have the
        following rights: the right to access your personal data; the right to
        correct inaccurate data; the right to delete your data; the right to
        restrict processing; the right to data portability; and the right to
        object to processing. You can exercise most of these rights directly
        through the app settings. For requests we cannot fulfill through the
        app, please contact our support team and we will respond within 30 days.
      </Text>
    </>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */

export function LegalDocumentModal({
  visible,
  onClose,
  documentType,
}: LegalDocumentModalProps) {
  const insets = useSafeAreaInsets();

  const title =
    documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top || spacing.md,
            paddingBottom: insets.bottom || spacing.md,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
          >
            <X size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {documentType === 'terms' ? (
            <TermsOfServiceContent />
          ) : (
            <PrivacyPolicyContent />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  meta: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 17,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
