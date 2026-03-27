/**
 * LockStateView -- Display for locked/waiting unpacking state.
 *
 * Design: RelateApp_DesignSpec.md -- warm-light theme.
 *   - White elevated card centered on screen
 *   - Lock icon in orange accent
 *   - Cormorant display title, DM Sans body
 *   - Primary action: orange gradient button
 *   - Secondary action: ghost text button
 *
 * Used in UnpackingScreen when the unpacking is still locked
 * (waiting for partner or waiting for mutual unlock).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { colors, fontFamilies, shadows } from '../../theme';

interface LockStateViewProps {
  /** Title text (e.g. "Unlock together"). */
  title: string;
  /** Main message explaining the lock state. */
  message: string;
  /** Optional secondary message (e.g. auto-unlock time). */
  secondaryMessage?: string;
  /** Label for primary action button. */
  primaryActionLabel?: string;
  /** Callback for primary action. */
  onPrimaryAction?: () => void;
  /** Label for secondary action button. */
  secondaryActionLabel?: string;
  /** Callback for secondary action. */
  onSecondaryAction?: () => void;
  /** Whether an action is in progress. */
  loading?: boolean;
}

export function LockStateView({
  title,
  message,
  secondaryMessage,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  loading,
}: LockStateViewProps) {
  return (
    <Card style={styles.card} elevated>
      <View style={styles.iconCircle}>
        <Lock size={24} color={colors.orangeMid} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {secondaryMessage ? (
        <Text style={styles.secondaryMessage}>{secondaryMessage}</Text>
      ) : null}
      {primaryActionLabel && onPrimaryAction ? (
        <Button
          title={primaryActionLabel}
          onPress={onPrimaryAction}
          loading={loading}
          style={styles.primaryButton}
        />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <Button
          title={secondaryActionLabel}
          onPress={onSecondaryAction}
          variant="ghost"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginTop: 20,
    padding: 28,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  secondaryMessage: {
    fontFamily: fontFamilies.body,
    marginTop: 6,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 20,
    alignSelf: 'stretch',
  },
});
