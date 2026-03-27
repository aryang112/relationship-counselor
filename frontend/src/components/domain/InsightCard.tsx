/**
 * InsightCard — Card displaying an AI-generated insight with partner attribution.
 *
 * Design System: RelateApp_DesignSpec.md §2.5 "InsightCard"
 *
 * Uses the base Card component (white bg, 24px radius, card shadow).
 * Includes an attribution pill tag indicating insight source:
 *   - A (Partner A): orangeTint bg, orangeDeep text, partnerA left border.
 *   - B (Partner B): partnerB tint bg, partnerB text, partnerB left border.
 *   - both (Shared): shared/lavender tint bg, shared text, shared left border.
 *
 * Title: DM Sans 600, 16px, textPrimary.
 * Content: DM Sans 400, 16px, line-height 26, textPrimary.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { colors, fontFamilies, radius } from '../../theme';

type InsightAttribution = 'A' | 'B' | 'both' | null;

interface InsightCardProps {
  /** Title displayed at the top of the card. */
  title: string;
  /** Main body content of the insight. */
  content: string;
  /** Partner attribution -- sets border color and badge. */
  attribution?: InsightAttribution;
  /** Reserved for future expand/collapse behavior. */
  defaultExpanded?: boolean;
}

/** Configuration for each attribution type. */
const attributionConfig = {
  A: {
    label: 'FROM YOU',
    borderColor: colors.partnerA,
    bgColor: colors.orangeTint,
    textColor: colors.orangeDeep,
  },
  B: {
    label: 'FROM THEM',
    borderColor: colors.partnerB,
    bgColor: '#E0EAF0',
    textColor: colors.partnerB,
  },
  both: {
    label: 'FROM BOTH',
    borderColor: colors.shared,
    bgColor: '#EDE4F5',
    textColor: colors.shared,
  },
};

export function InsightCard({
  title,
  content,
  attribution = null,
}: InsightCardProps) {
  const attr = attribution ? attributionConfig[attribution] : null;

  return (
    <Card
      statusColor={attr?.borderColor}
      style={styles.card}
      elevated
    >
      {attr && (
        <View style={[styles.attributionTag, { backgroundColor: attr.bgColor }]}>
          <Text style={[styles.attributionText, { color: attr.textColor }]}>
            {attr.label}
          </Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {content ? (
        <Text style={styles.content}>{content}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  attributionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: 10,
  },
  attributionText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  content: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
  },
});
