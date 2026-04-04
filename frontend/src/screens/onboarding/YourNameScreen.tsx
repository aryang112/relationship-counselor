/**
 * YourNameScreen — Captures the user's first name during onboarding.
 *
 * Minimal, warm layout with a single auto-focused text input.
 * Features a thin orange progress bar at the top and the "Next" button
 * remains disabled until a name is entered.
 *
 * This screen runs BEFORE authentication (quiz-first flow), so data is
 * stored locally in onboardingStore only. The profile is persisted to
 * the backend during finishOnboarding() after account creation.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Keyboard, TouchableWithoutFeedback } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Button } from '../../components/ui/Button';
import { KeyboardDoneBar, KEYBOARD_DONE_ID } from '../../components/ui/KeyboardDoneBar';
import { colors, fontFamilies, typography, spacing, radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import type { Gender } from '../../store/onboardingStore';
import { selectionTap } from '../../utils/haptics';

const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'non-binary', label: 'Non-binary' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];

interface YourNameScreenProps {
  onNext: () => void;
  progress: number; // 0 to 1
}

export function YourNameScreen({ onNext, progress }: YourNameScreenProps) {
  const firstName = useOnboardingStore((s) => s.firstName);
  const gender = useOnboardingStore((s) => s.gender);
  const setField = useOnboardingStore((s) => s.setField);
  const inputRef = useRef<TextInput>(null);

  const selectGender = (id: Gender) => {
    selectionTap();
    setField('gender', id);
  };

  const handleNext = () => {
    // Data is already in onboardingStore via setField — just advance.
    // Profile is persisted to backend during finishOnboarding() after auth.
    onNext();
  };

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

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <KeyboardAware style={styles.keyboardContent}>
            <Container style={styles.container}>
              <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                <Text style={styles.title} accessibilityRole="header">
                  What's your first name?
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
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  inputAccessoryViewID={KEYBOARD_DONE_ID}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(600)}>
                <Text style={styles.genderLabel}>How do you identify?</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((opt) => {
                    const isSelected = gender === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.genderPill, isSelected && styles.genderPillSelected]}
                        onPress={() => selectGender(opt.id)}
                      >
                        <Text style={[styles.genderPillText, isSelected && styles.genderPillTextSelected]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(800)} style={styles.actions}>
                <Button
                  title="Next"
                  onPress={handleNext}
                  disabled={!firstName.trim()}
                  size="lg"
                />
              </Animated.View>
            </Container>
          </KeyboardAware>
        </View>
      </TouchableWithoutFeedback>
      <KeyboardDoneBar />
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
    marginBottom: spacing.xl,
  },
  genderLabel: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  genderPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  genderPillSelected: {
    borderColor: colors.orangeMid,
    backgroundColor: colors.orangeTint,
  },
  genderPillText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  genderPillTextSelected: {
    color: colors.orangeDeep,
    fontFamily: fontFamilies.bodyBold,
  },
  actions: {
    marginTop: spacing.md,
  },
});
