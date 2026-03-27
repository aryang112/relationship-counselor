/**
 * CommitmentCard -- Checkable card for a commitment/learning item.
 *
 * Design: RelateApp_DesignSpec.md -- warm-light theme.
 *   - White card (bgElevated) with warm shadow
 *   - 28px circle checkbox: empty = border only, checked = orangeMid fill
 *   - Cormorant display title + DM Sans description
 *
 * Used in CommitmentsScreen and potentially LearningsHistoryScreen.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { colors, fontFamilies } from '../../theme';

interface CommitmentCardProps {
  /** Title of the commitment. */
  title: string;
  /** Description text below the title. */
  description: string;
  /** Whether this commitment is checked/agreed to. */
  checked: boolean;
  /** Toggle callback. */
  onToggle: () => void;
}

export function CommitmentCard({
  title,
  description,
  checked,
  onToggle,
}: CommitmentCardProps) {
  return (
    <Card style={styles.card} elevated>
      <Pressable
        style={styles.row}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? colors.orangeMid : colors.border,
              backgroundColor: checked ? colors.orangeMid : 'transparent',
            },
          ]}
        >
          {checked ? (
            <Check size={14} color={colors.textInverse} strokeWidth={3} />
          ) : null}
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  description: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});
