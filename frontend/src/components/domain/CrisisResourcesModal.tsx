/**
 * CrisisResourcesModal — Full-screen modal displaying crisis hotline resources.
 *
 * Always accessible from the Pre-Session Reminder screen (and anywhere else
 * crisis resources might be surfaced). Shows tappable phone numbers and URLs
 * for national crisis services.
 *
 * Uses React Native Modal with slide animation and pageSheet presentation.
 * Each resource is rendered as a card with a lucide icon, title, and
 * tappable contact info via Linking.openURL.
 *
 * Design System: RelateApp_DesignSpec.md — warm light theme tokens.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, MessageCircle, Heart, Globe, X } from 'lucide-react-native';
import { colors, fontFamilies, spacing, radius, shadows } from '../../theme';

/** Props for the CrisisResourcesModal component */
interface CrisisResourcesModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Individual crisis resource definition */
interface CrisisResource {
  icon: React.ReactNode;
  title: string;
  contact: string;
  action: () => void;
  subtitle?: string;
}

/** Open a phone number via the system dialer */
function openPhone(number: string) {
  Linking.openURL(`tel:${number.replace(/[^0-9+]/g, '')}`);
}

/** Open a URL in the system browser */
function openUrl(url: string) {
  Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
}

/** List of crisis resources with their contact information */
const RESOURCES: CrisisResource[] = [
  {
    icon: <Phone color={colors.orangeMid} size={22} />,
    title: 'National Domestic Violence Hotline',
    contact: 'Call or text 1-800-799-7233',
    subtitle: 'thehotline.org',
    action: () => openPhone('1-800-799-7233'),
  },
  {
    icon: <MessageCircle color={colors.orangeMid} size={22} />,
    title: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    action: () => Linking.openURL('sms:741741&body=HOME'),
  },
  {
    icon: <Heart color={colors.orangeMid} size={22} />,
    title: 'SAMHSA Mental Health Helpline',
    contact: '1-800-662-4357 (free, confidential, 24/7)',
    action: () => openPhone('1-800-662-4357'),
  },
  {
    icon: <Globe color={colors.orangeMid} size={22} />,
    title: 'Find a therapist near you',
    contact: 'psychologytoday.com/us/therapists',
    action: () => openUrl('https://psychologytoday.com/us/therapists'),
  },
];

export function CrisisResourcesModal({ visible, onClose }: CrisisResourcesModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top || spacing.lg }]}>
        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel="Close crisis resources"
          accessibilityRole="button"
          hitSlop={12}
        >
          <X color={colors.textSecondary} size={24} />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.title}>
            You don't have to go through this alone.
          </Text>
          <Text style={styles.body}>
            If you or your partner are in crisis, or if you feel unsafe, please
            reach out to someone who can help.
          </Text>

          {/* Resource cards */}
          <View style={styles.resourcesList}>
            {RESOURCES.map((resource, index) => (
              <Pressable
                key={index}
                style={styles.resourceCard}
                onPress={resource.action}
                accessibilityRole="link"
                accessibilityLabel={`${resource.title}: ${resource.contact}`}
              >
                <View style={styles.resourceIconWrap}>
                  {resource.icon}
                </View>
                <View style={styles.resourceTextWrap}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceContact}>{resource.contact}</Text>
                  {resource.subtitle && (
                    <Text style={styles.resourceSubtitle}>{resource.subtitle}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Close button at bottom */}
          <Pressable
            onPress={onClose}
            style={styles.goBackBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back to Relate"
          >
            <Text style={styles.goBackText}>Go Back to Relate</Text>
          </Pressable>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            Relate is not a crisis service and cannot contact emergency services
            on your behalf.
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
  },

  // Header
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },

  // Resources list
  resourcesList: {
    gap: 12,
    marginBottom: spacing['2xl'],
  },
  resourceCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...shadows.card,
  },
  resourceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  resourceTextWrap: {
    flex: 1,
  },
  resourceTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  resourceContact: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.orangeMid,
  },
  resourceSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.orangeMid,
    marginTop: 2,
  },

  // Go back button
  goBackBtn: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.orangeMid,
    marginBottom: spacing.lg,
  },
  goBackText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.orangeMid,
    textAlign: 'center',
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
