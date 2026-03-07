/**
 * RelationshipStoryScreen — Multi-step screen capturing the couple's story.
 *
 * Steps within this screen:
 *   1. "When did you start dating?" — date input (month/year picker style)
 *   2. "Are you long-distance?" — two large selectable cards (YES/NO)
 *   3. "How did you two meet?" — text input
 *   4. "Where was your first date?" — optional text input
 *
 * Uses internal step state to walk through the four sub-questions,
 * reducing the number of navigation screens while keeping each
 * question focused.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { selectionTap } from '../../utils/haptics';

const TOTAL_STEPS = 4;

interface RelationshipStoryScreenProps {
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export function RelationshipStoryScreen({
  onNext,
  onBack,
  progress,
}: RelationshipStoryScreenProps) {
  const [step, setStep] = useState(0);
  const store = useOnboardingStore();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (step === 2 || step === 3) {
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const canContinue = () => {
    switch (step) {
      case 0: return store.datingStartDate.trim().length > 0;
      case 1: return store.isLongDistance !== null;
      case 2: return store.howMet.trim().length > 0;
      case 3: return true; // First date location is optional
      default: return false;
    }
  };

  // Adjusted progress for sub-steps
  const subProgress = progress + (step / TOTAL_STEPS) * (1 / 10);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Animated.View key="step0" entering={FadeInDown.duration(500)}>
            <Text style={styles.title}>When did you start dating?</Text>
            <Text style={styles.subtitle}>
              A rough date is fine — month and year works.
            </Text>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="e.g. March 2022"
              placeholderTextColor={colors.textMuted}
              value={store.datingStartDate}
              onChangeText={(text) => store.setField('datingStartDate', text)}
              returnKeyType="next"
              onSubmitEditing={() => canContinue() && handleNext()}
            />
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View key="step1" entering={FadeInDown.duration(500)}>
            <Text style={styles.title}>Are you long-distance?</Text>
            <Text style={styles.subtitle}>
              This helps us understand your relationship context.
            </Text>
            <View style={styles.cardRow}>
              <Pressable
                style={styles.selectCardWrapper}
                onPress={() => {
                  selectionTap();
                  store.setField('isLongDistance', true);
                }}
              >
                <Card
                  style={{
                    ...styles.selectCard,
                    ...(store.isLongDistance === true ? styles.selectCardActive : {}),
                  }}
                  elevated={store.isLongDistance === true}
                >
                  <Text style={styles.selectCardEmoji}>{'  '}</Text>
                  <Text
                    style={[
                      styles.selectCardLabel,
                      store.isLongDistance === true && styles.selectCardLabelActive,
                    ]}
                  >
                    Yes
                  </Text>
                  <Text style={styles.selectCardHint}>We live apart</Text>
                </Card>
              </Pressable>

              <Pressable
                style={styles.selectCardWrapper}
                onPress={() => {
                  selectionTap();
                  store.setField('isLongDistance', false);
                }}
              >
                <Card
                  style={{
                    ...styles.selectCard,
                    ...(store.isLongDistance === false ? styles.selectCardActive : {}),
                  }}
                  elevated={store.isLongDistance === false}
                >
                  <Text style={styles.selectCardEmoji}>{'  '}</Text>
                  <Text
                    style={[
                      styles.selectCardLabel,
                      store.isLongDistance === false && styles.selectCardLabelActive,
                    ]}
                  >
                    No
                  </Text>
                  <Text style={styles.selectCardHint}>We live together or nearby</Text>
                </Card>
              </Pressable>
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View key="step2" entering={FadeInDown.duration(500)}>
            <Text style={styles.title}>How did you two meet?</Text>
            <Text style={styles.subtitle}>
              A brief story is perfect.
            </Text>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, styles.textArea]}
              placeholder="Through friends, at a coffee shop, on an app..."
              placeholderTextColor={colors.textMuted}
              value={store.howMet}
              onChangeText={(text) => store.setField('howMet', text)}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View key="step3" entering={FadeInDown.duration(500)}>
            <Text style={styles.title}>Where was your first date?</Text>
            <Text style={styles.subtitle}>
              Optional — but it helps paint the picture.
            </Text>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="A park, a restaurant, a hike..."
              placeholderTextColor={colors.textMuted}
              value={store.firstDateLocation}
              onChangeText={(text) => store.setField('firstDateLocation', text)}
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(Math.min(subProgress, 1) * 100)}%` },
          ]}
        />
      </View>

      <KeyboardAware style={styles.keyboardContent}>
        <Container style={styles.container}>
          {renderStep()}
        </Container>
      </KeyboardAware>

      <View style={styles.actions}>
        <Container>
          {/* Step indicator */}
          <View style={styles.stepDots}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotComplete,
                ]}
              />
            ))}
          </View>
          <Button
            title={step === TOTAL_STEPS - 1 ? 'Continue' : 'Next'}
            onPress={handleNext}
            disabled={!canContinue()}
            size="lg"
            style={styles.nextBtn}
          />
          <Button title="Back" onPress={handleBack} variant="ghost" />
        </Container>
      </View>
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
    paddingVertical: spacing.xl,
  },
  container: {
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  textInput: {
    fontFamily: fontFamilies.body,
    fontSize: 20,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  textArea: {
    borderBottomWidth: 0,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 120,
    fontSize: 17,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  selectCardWrapper: {
    flex: 1,
  },
  selectCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selectCardActive: {
    borderColor: colors.orangeMid,
    backgroundColor: colors.orangeTint,
  },
  selectCardEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  selectCardLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  selectCardLabelActive: {
    color: colors.orangeDeep,
  },
  selectCardHint: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.bgSecondary,
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.orangeMid,
    width: 24,
  },
  dotComplete: {
    backgroundColor: colors.orangeLight,
  },
  nextBtn: {
    marginBottom: spacing.sm,
  },
});
