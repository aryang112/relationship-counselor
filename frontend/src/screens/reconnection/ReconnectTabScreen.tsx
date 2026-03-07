/**
 * ReconnectTabScreen — Landing page for the "Reconnect" bottom tab.
 *
 * Shows recent reconnection sessions or an empty state prompt.
 * This is separate from ReconnectionScreen (which requires a sessionId param)
 * because the tab navigator does not pass route params.
 *
 * Design: Warm light theme, bgPrimary background.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography, fontFamilies } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';

export function ReconnectTabScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Reconnect</Text>

      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Heart size={32} color={colors.orangeMid} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No active reconnection</Text>
        <Text style={styles.emptyDesc}>
          After you and your partner both complete your interviews, you'll meet
          here for a guided reconnection conversation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    ...typography.displayMd,
    color: colors.textPrimary,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyState: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xl,
    ...shadows.card,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
