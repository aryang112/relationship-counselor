/**
 * YourNameScreen — Captures the user's first name during onboarding.
 *
 * Minimal, warm layout with a single auto-focused text input.
 * Features a thin orange progress bar at the top and the "Next" button
 * remains disabled until a name is entered.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing, radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';

interface YourNameScreenProps {
  onNext: () => void;
  progress: number; // 0 to 1
}

export function YourNameScreen({ onNext, progress }: YourNameScreenProps) {
  const firstName = useOnboardingStore((s) => s.firstName);
  const setField = useOnboardingStore((s) => s.setField);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>

      <KeyboardAware style={styles.keyboardContent}>
        <Container style={styles.container}>
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={styles.title}>
              What's your first name?
            </Text>
            <Text style={styles.subtitle}>
              Your partner will see this.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <TextInput
              ref={inputRef}
              style={styles.nameInput}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={(text) => setField('firstName', text)}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => firstName.trim() && onNext()}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.actions}>
            <Button
              title="Next"
              onPress={onNext}
              disabled={!firstName.trim()}
              size="lg"
            />
          </Animated.View>
        </Container>
      </KeyboardAware>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 3,
    backgroundColor: colors.bgSecondary,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.orangeMid,
    borderRadius: 2,
  },
  keyboardContent: {
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  container: {
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing['2xl'],
  },
  nameInput: {
    fontFamily: fontFamilies.body,
    fontSize: 24,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing['2xl'],
  },
  actions: {
    marginTop: spacing.md,
  },
});
