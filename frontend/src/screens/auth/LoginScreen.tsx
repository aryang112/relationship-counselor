/**
 * LoginScreen — Sign-in form for returning users.
 *
 * Design System: RelateApp_DesignSpec.md §3 "Auth Screens"
 *
 * Layout:
 *   - bgPrimary (#FAF7F4) background
 *   - "Welcome back" header in Cormorant display font
 *   - Email + Password inputs (white bg, #E8DDD4 border)
 *   - "Forgot password?" ghost link
 *   - Primary gradient login button
 *   - "Create account" secondary link
 *
 * Form validation uses react-hook-form + zod.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Keyboard } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { KeyboardDoneBar, KEYBOARD_DONE_ID } from '../../components/ui/KeyboardDoneBar';
import { colors } from '../../theme/colors';
import { typography, fontFamilies } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { loginSchema, type LoginFormData } from '../../utils/validation';
import { login } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { successTap } from '../../utils/haptics';

interface LoginScreenProps {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
  onSuccess: () => void;
}

export function LoginScreen({
  onNavigateRegister,
  onNavigateForgot,
  onSuccess,
}: LoginScreenProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      Keyboard.dismiss();
      setLoading(true);
      try {
        const res = await login(data);
        setUser(res.user);
        successTap();
        onSuccess();
      } catch (err: any) {
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;
        let message: string;
        if (status === 401) {
          message = 'Incorrect email or password. Please try again.';
        } else if (!err?.response) {
          message = 'Could not reach the server. Check your connection and try again.';
        } else {
          message = Array.isArray(serverMsg) ? serverMsg[0] : serverMsg || 'Sign in failed. Please try again.';
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
      <KeyboardDoneBar />
      <KeyboardAware style={styles.content}>
        <Container>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your journey together
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
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                inputAccessoryViewID={KEYBOARD_DONE_ID}
              />
            )}
          />

          <Pressable onPress={onNavigateForgot} style={styles.forgotLink}>
            <Text style={styles.forgotText}>
              Forgot password?
            </Text>
          </Pressable>

          <Button
            title="Sign in"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={onNavigateRegister}>
              <Text style={styles.linkText}>
                Sign up
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: '500',
    color: colors.orangeMid,
  },
  submitBtn: {
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
