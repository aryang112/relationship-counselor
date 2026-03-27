/**
 * ChatBubble — Message bubble for the reconnection/chat screen.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "ChatBubble"
 *
 * Three roles with distinct visual treatments:
 *
 *   User (Partner A) — right-aligned:
 *     Background: partnerA (#E07832) solid orange.
 *     Text: white. Tail: bottom-right corner radius reduced.
 *
 *   Partner (Partner B) — left-aligned:
 *     Background: bgSecondary (#F2EDE6) warm off-white.
 *     Border: 1px solid border (#E8DDD4).
 *     Text: textPrimary. Tail: bottom-left corner radius reduced.
 *
 *   AI (Relate) — center-aligned:
 *     Background: bgElevated (#FFFFFF) white card.
 *     Left border: 3px orangeMid (#E07832).
 *     Label: "relate" sparkle prefix.
 *     Text: textPrimary, italic.
 *     Card shadow applied.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { FadeInRight, FadeInLeft, FadeIn } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';

type BubbleRole = 'user' | 'partner' | 'ai';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  role?: BubbleRole;
  timestamp?: string;
  style?: ViewStyle;
  /** Optional index for stagger delay (each bubble delayed by index * 50ms). */
  index?: number;
}

export function ChatBubble({ message, isUser, role, timestamp, style, index }: ChatBubbleProps) {
  const effectiveRole: BubbleRole = role ?? (isUser ? 'user' : 'ai');
  const staggerDelay = index != null ? index * 50 : 0;

  if (effectiveRole === 'ai') {
    const aiEntering = staggerDelay > 0
      ? FadeIn.duration(400).delay(100 + staggerDelay)
      : FadeIn.duration(400).delay(100);

    return (
      <Animated.View style={[styles.containerAI, style]} entering={aiEntering}>
        <View style={[styles.bubbleAI, shadows.card]}>
          <Text style={styles.relateLabel}>relate</Text>
          <Text style={styles.textAI}>{message}</Text>
        </View>
        {timestamp && <Text style={styles.timestampCenter}>{timestamp}</Text>}
      </Animated.View>
    );
  }

  if (effectiveRole === 'user') {
    const userEntering = staggerDelay > 0
      ? FadeInRight.duration(300).springify().damping(15).stiffness(100).delay(staggerDelay)
      : FadeInRight.duration(300).springify().damping(15).stiffness(100);

    return (
      <Animated.View style={[styles.containerUser, style]} entering={userEntering}>
        <View style={styles.bubbleUser}>
          <Text style={styles.textUser}>{message}</Text>
        </View>
        {timestamp && <Text style={styles.timestampUser}>{timestamp}</Text>}
      </Animated.View>
    );
  }

  // Partner B
  const partnerEntering = staggerDelay > 0
    ? FadeInLeft.duration(300).springify().damping(15).stiffness(100).delay(staggerDelay)
    : FadeInLeft.duration(300).springify().damping(15).stiffness(100);

  return (
    <Animated.View style={[styles.containerPartner, style]} entering={partnerEntering}>
      <View style={styles.bubblePartner}>
        <Text style={styles.textPartner}>{message}</Text>
      </View>
      {timestamp && <Text style={styles.timestampPartner}>{timestamp}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Partner A (user) — right-aligned, solid orange
  containerUser: {
    alignSelf: 'flex-end',
    marginVertical: 4,
    maxWidth: '80%',
  },
  bubbleUser: {
    backgroundColor: colors.partnerA,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  textUser: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  timestampUser: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
    marginRight: 4,
  },

  // Partner B — left-aligned, warm off-white with border
  containerPartner: {
    alignSelf: 'flex-start',
    marginVertical: 4,
    maxWidth: '80%',
  },
  bubblePartner: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  textPartner: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  timestampPartner: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 4,
  },

  // AI (Relate) — center-aligned, white card with orange left border
  containerAI: {
    alignSelf: 'center',
    marginVertical: 8,
    width: '90%',
  },
  bubbleAI: {
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.orangeMid,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  relateLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.orangeMid,
    marginBottom: 4,
  },
  textAI: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  timestampCenter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
