/**
 * RegisterScreen — Account creation form for new users.
 *
 * Design System: RelateApp_DesignSpec.md §3 "Auth Screens"
 *
 * Layout:
 *   - bgPrimary (#FAF7F4) background
 *   - "Join relate" header in Cormorant display font
 *   - Name + Email + Password inputs (white bg, #E8DDD4 border)
 *   - Password strength indicator
 *   - Primary gradient register button
 *   - "Already have an account?" link
 *
 * Form validation uses react-hook-form + zod.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Keyboard } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { typography, fontFamilies } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { registerSchema, type RegisterFormData } from '../../utils/validation';
import { register } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { successTap } from '../../utils/haptics';

interface RegisterScreenProps {
  onNavigateLogin: () => void;
  onSuccess: () => void;
}

function getPasswordStrength(pw: string): { label: string; color: string; width: number } {
  if (pw.length === 0) return { label: '', color: 'transparent', width: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: colors.error, width: 25 };
  if (score === 2) return { label: 'Fair', color: colors.warning, width: 50 };
  if (score === 3) return { label: 'Good', color: colors.partnerB, width: 75 };
  return { label: 'Strong', color: colors.success, width: 100 };
}

export function RegisterScreen({ onNavigateLogin, onSuccess }: RegisterScreenProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const password = watch('password');
  const strength = useMemo(() => getPasswordStrength(password || ''), [password]);

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      Keyboard.dismiss();
      setLoading(true);
      try {
        const payload = {
          ...data,
          name: data.email.split('@')[0],
        };
        const res = await register(payload);
        setUser(res.user);
        successTap();
        onSuccess();
      } catch (err: any) {
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;
        let message: string;
        if (status === 409) {
          message = 'An account with this email already exists. Try signing in instead.';
        } else if (!err?.response) {
          message = 'Could not reach the server. Check your connection and try again.';
        } else {
          message = Array.isArray(serverMsg) ? serverMsg[0] : serverMsg || 'Registration failed. Please try again.';
        }
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [setUser, addToast, onSuccess],
  );

  return (
    <SafeArea>
      <KeyboardAware style={styles.content}>
        <Container>
          <View style={styles.header}>
            <Text style={styles.title}>
              Join relate
            </Text>
            <Text style={styles.subtitle}>
              Start building a stronger relationship together
            </Text>
          </View>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Min. 8 characters"
                secureTextEntry
                autoComplete="new-password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          {strength.label !== '' && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthTrack}>
                <View
                  style={[
                    styles.strengthFill,
                    { width: `${strength.width}%`, backgroundColor: strength.color },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
          )}

          <Button
            title="Create account"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={onNavigateLogin}>
              <Text style={styles.linkText}>
                Sign in
              </Text>
            </Pressable>
          </View>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    fontWeight: '500',
    lineHeight: 38,
    letterSpacing: -0.3,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 20,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 10,
    backgroundColor: colors.bgSecondary,
  },
  strengthFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    fontWeight: '600',
    width: 50,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.orangeMid,
  },
});
