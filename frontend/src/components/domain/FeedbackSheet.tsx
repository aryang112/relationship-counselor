/**
 * FeedbackSheet -- Bottom sheet for submitting feedback on AI unpacking insights.
 *
 * Design: RelateApp_DesignSpec.md -- warm-light theme.
 *   - Clean white bottom sheet (bgElevated)
 *   - Reason chips: orangeMid when selected, bgPrimary when not
 *   - Cormorant display title, DM Sans body
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { colors, fontFamilies, radius } from '../../theme';
import type { SubmitFeedbackRequest, UnpackingFeedbackReason } from '../../types/session';

const FEEDBACK_REASONS: Array<{ label: string; value: UnpackingFeedbackReason }> = [
  { label: 'Missed core issue', value: 'missed_core_issue' },
  { label: 'Inaccurate perspective', value: 'inaccurate_partner_perspective' },
  { label: 'Too generic', value: 'too_generic' },
  { label: 'Other', value: 'other' },
];

interface FeedbackSheetProps {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: SubmitFeedbackRequest) => Promise<void>;
}

export function FeedbackSheet({
  visible,
  loading,
  onClose,
  onSubmit,
}: FeedbackSheetProps) {
  const [reason, setReason] = useState<UnpackingFeedbackReason>('missed_core_issue');
  const [feedbackText, setFeedbackText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const showText = reason === 'other';

  const helperText = useMemo(() => {
    if (!showText) {
      return 'Optional: add context to help us improve future insights.';
    }
    return undefined;
  }, [showText]);

  const handleSubmit = async () => {
    if (showText && !feedbackText.trim()) {
      setLocalError('Please add details when selecting "Other".');
      return;
    }

    setLocalError(null);
    await onSubmit({
      feedbackReason: reason,
      feedbackText: feedbackText.trim() || undefined,
    });
    setFeedbackText('');
    setReason('missed_core_issue');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Improve these insights</Text>
      <Text style={styles.subtitle}>Tell us what felt off so we can regenerate better guidance.</Text>

      <View style={styles.reasonGrid}>
        {FEEDBACK_REASONS.map((item) => {
          const selected = reason === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setReason(item.value)}
              style={[
                styles.reasonChip,
                {
                  backgroundColor: selected ? colors.orangeMid : colors.bgPrimary,
                  borderColor: selected ? colors.orangeMid : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.reasonText,
                  { color: selected ? colors.textInverse : colors.textPrimary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label={showText ? 'What should we know?' : 'Additional details (optional)'}
        placeholder="Share context"
        multiline
        value={feedbackText}
        onChangeText={setFeedbackText}
        helperText={helperText}
        error={localError || undefined}
        containerStyle={styles.input}
      />

      <View style={styles.actions}>
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title="Submit feedback" onPress={handleSubmit} loading={loading} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  reasonGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reasonText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
  },
  input: {
    marginTop: 16,
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
