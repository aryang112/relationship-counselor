/**
 * ForgotPasswordScreen — Password reset request form.
 *
 * Design System: RelateApp_DesignSpec.md §3 "Auth Screens"
 *
 * Layout:
 *   - bgPrimary (#FAF7F4) background
 *   - "Reset password" header in Cormorant display font
 *   - Email input (white bg, #E8DDD4 border)
 *   - Primary submit button
 *   - Ghost "Back to sign in" link
 *   - Success state with confirmation message
 *
 * Note: Backend doesn't implement forgot-password yet;
 * shows a success message regardless for UX completeness.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, fontFamilies } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { successTap } from '../../utils/haptics';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(() => {
    // Backend doesn't have forgot-password yet; show success message anyway
    successTap();
    setSent(true);
  }, []);

  if (sent) {
    return (
      <SafeArea>
        <Container style={styles.centered}>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>&#x2709;&#xFE0F;</Text>
            <Text style={styles.title}>
              Check your email
            </Text>
            <Text style={styles.message}>
              If an account exists for {email}, we'll send password reset
              instructions.
            </Text>
          </View>
          <Button
            title="Back to sign in"
            onPress={onBack}
            variant="secondary"
            style={styles.backBtn}
          />
        </Container>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <KeyboardAware style={styles.content}>
        <Container>
          <Text style={styles.title}>
            Reset password
          </Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you instructions
          </Text>
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Button
            title="Send reset link"
            onPress={handleSubmit}
            disabled={!email.includes('@')}
            style={styles.submitBtn}
          />
          <Button
            title="Back to sign in"
            onPress={onBack}
            variant="ghost"
          />
        </Container>
      </KeyboardAware>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingVertical: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 34,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  successCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  successEmoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
    maxWidth: 300,
  },
  submitBtn: {
    marginBottom: 12,
  },
  backBtn: {
    marginTop: 8,
    width: '100%',
    maxWidth: 300,
  },
});
