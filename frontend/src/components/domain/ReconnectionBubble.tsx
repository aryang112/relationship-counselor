/**
 * ReconnectionBubble -- Chat message bubble for the guided reconnection chat.
 *
 * Design: RelateApp_DesignSpec.md "Reconnection Chat"
 *   - Partner A (me, right): Orange gradient bubble, white text
 *   - Partner B (partner, left): Blue-gray gradient bubble, white text
 *   - AI Mediator (center, full width): White card with orange left border
 *     - Labeled "relate" with small orange label text
 *     - Italic body text, clearly different from partner messages
 *
 * This component is used by ReconnectionScreen for the message list.
 * The gradient rendering is now handled inline in ReconnectionScreen
 * via LinearGradient, but this component is kept for backward compat
 * and can still be used as a simpler non-gradient alternative.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { colors, fontFamilies, radius, shadows } from '../../theme';
import { formatTime } from '../../utils/format';

export type ReconnectionRole = 'me' | 'partner' | 'ai';

interface ReconnectionBubbleProps {
  /** Role of the message sender. */
  role: ReconnectionRole;
  /** Message text content. */
  text: string;
  /** ISO timestamp for display. */
  timestamp: string;
}

export function ReconnectionBubble({ role, text, timestamp }: ReconnectionBubbleProps) {
  // AI mediator message -- full-width white card with orange left border
  if (role === 'ai') {
    return (
      <View style={styles.aiContainer}>
        <View style={styles.aiBubble}>
          <View style={styles.aiLabelRow}>
            <Sparkles size={10} color={colors.orangeMid} />
            <Text style={styles.aiLabel}>relate</Text>
          </View>
          <Text style={styles.aiText}>{text}</Text>
        </View>
      </View>
    );
  }

  // Partner message bubbles
  const isMine = role === 'me';
  return (
    <View style={[styles.row, isMine ? styles.mine : styles.theirs]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? colors.orangeMid : colors.partnerB,
          },
        ]}
      >
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
      <Text style={styles.time}>{formatTime(timestamp)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ---- Partner bubbles ----
  row: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  mine: {
    alignSelf: 'flex-end',
  },
  theirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textInverse,
  },
  time: {
    fontFamily: fontFamilies.body,
    marginTop: 4,
    fontSize: 11,
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },

  // ---- AI mediator ----
  aiContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  aiBubble: {
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.orangeMid,
    borderRadius: radius.md,
    padding: 14,
    maxWidth: '92%',
    ...shadows.sm,
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  aiLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.orangeMid,
  },
  aiText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
});
