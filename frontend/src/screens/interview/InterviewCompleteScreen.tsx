/**
 * InterviewCompleteScreen — Shown after the user finishes their private vent.
 *
 * Design System: RelateApp_DesignSpec.md §4 "Interview Complete"
 *
 * Layout:
 *   - Warm bgPrimary background, centered content
 *   - Success emoji with soft orangeTint circle backdrop
 *   - Cormorant Garamond heading: "You did great"
 *   - DM Sans body text explaining next steps
 *   - Partner wait note
 *   - Primary CTA button to return to dashboard
 *
 * Preserves existing props interface (partnerName, onContinue).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';

interface InterviewCompleteScreenProps {
  partnerName?: string;
  onContinue: () => void;
}

export function InterviewCompleteScreen({
  partnerName,
  onContinue,
}: InterviewCompleteScreenProps) {
  return (
    <SafeArea>
      <View style={styles.container}>
        {/* Success visual */}
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>🌟</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>You did great</Text>

        {/* Body */}
        <Text style={styles.body}>
          Thank you for being open and honest. Your responses are private and
          will be used to create a thoughtful analysis of your situation.
        </Text>

        {/* Partner wait note */}
        <View style={styles.waitCard}>
          <Text style={styles.waitIcon}>⏳</Text>
          <Text style={styles.waitNote}>
            {partnerName
              ? `Once ${partnerName} completes their interview, the unpacking will begin.`
              : 'Once your partner completes their interview, the unpacking will begin.'}
          </Text>
        </View>

        {/* CTA */}
        <Button
          title="Back to dashboard"
          onPress={onContinue}
          size="lg"
          style={styles.btn}
        />
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bgPrimary,
  },

  // Emoji with backdrop circle
  emojiCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  emoji: {
    fontSize: 48,
  },

  // Title
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },

  // Body text
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 320,
  },

  // Wait card
  waitCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.xl,
    ...shadows.card,
    maxWidth: 340,
  },
  waitIcon: {
    fontSize: 24,
  },
  waitNote: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    flex: 1,
  },

  // Button
  btn: {
    width: '100%',
    maxWidth: 320,
  },
});
