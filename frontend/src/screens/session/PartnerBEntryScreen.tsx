/**
 * PartnerBEntryScreen — Entry point for Partner B when invited to share their side.
 *
 * Shows the topic tag, privacy note, and CTA to begin the interview.
 * Fetches context via getPartnerBContext on mount.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Lock } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, spacing, radius, shadows, typography } from '../../theme';
import { getPartnerBContext, snoozePartnerBInvite } from '../../services/sessions';
import type { PartnerBContext } from '../../types/api';

interface PartnerBEntryScreenProps {
  sessionId: string;
  onStartInterview: (openingMessage: string) => void;
  onGoBack: () => void;
}

export function PartnerBEntryScreen({ sessionId, onStartInterview, onGoBack }: PartnerBEntryScreenProps) {
  const [context, setContext] = useState<PartnerBContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [snoozing, setSnoozing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPartnerBContext(sessionId);
        setContext(data);
      } catch (err: any) {
        setError('Could not load session details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const handleSnooze = async () => {
    setSnoozing(true);
    try {
      await snoozePartnerBInvite(sessionId);
      onGoBack();
    } catch {
      // Silent fail
    } finally {
      setSnoozing(false);
    }
  };

  if (loading) {
    return (
      <SafeArea>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orangeMid} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeArea>
    );
  }

  if (error || !context) {
    return (
      <SafeArea>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Something went wrong.'}</Text>
          <Button title="Go Back" onPress={onGoBack} variant="secondary" />
        </View>
      </SafeArea>
    );
  }

  const ctaLabel = context.hasDraft ? 'Continue sharing \u2192' : 'Share how you\'re feeling \u2192';

  return (
    <SafeArea>
      <View style={styles.container}>
        {/* Partner avatar + name */}
        <View style={styles.avatarSection}>
          <Avatar name={context.initiatorName} size="lg" partnerRole="A" />
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          {context.initiatorName} asked me to reach out to you.
        </Text>

        {/* Topic tag */}
        <Text style={styles.topicTag}>
          Topic: {context.topicTag}
        </Text>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Lock color={colors.textMuted} size={14} />
          <Text style={styles.privacyText}>
            You'll only see their perspective after you've shared yours.
          </Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Primary CTA */}
        <Button
          title={ctaLabel}
          onPress={() => onStartInterview(context.openingMessage)}
          style={styles.primaryBtn}
        />

        {/* Secondary: Snooze */}
        <Pressable onPress={handleSnooze} disabled={snoozing} style={styles.snoozeBtn}>
          <Text style={styles.snoozeText}>
            {snoozing ? 'Snoozing...' : 'Not ready yet? Remind me later'}
          </Text>
        </Pressable>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
  loadingText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headline: {
    fontFamily: fontFamilies.body,
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  topicTag: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 22,
    lineHeight: 30,
    color: colors.orangeMid,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  privacyText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  primaryBtn: {
    marginBottom: spacing.md,
  },
  snoozeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  snoozeText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
