/**
 * PartnerDetailsScreen — Multi-step screen capturing partner information.
 *
 * Steps:
 *   1. Partner's first name
 *   2. Partner's communication style (same pills as CommunicationStyleScreen)
 *   3. What the user thinks hurts their partner most
 *
 * This mirrors the "about you" flow but from the perspective of how the
 * user perceives their partner — helping the AI calibrate its analysis.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing, radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { selectionTap } from '../../utils/haptics';

const COMMUNICATION_OPTIONS = [
  { id: 'withdraw', label: 'They withdraw and go quiet' },
  { id: 'talk', label: 'They need to talk it out immediately' },
  { id: 'analyze', label: 'They overthink and analyze everything' },
  { id: 'emotional', label: 'They get emotional and reactive' },
  { id: 'avoid', label: 'They avoid the topic entirely' },
];

const CONFLICT_OPTIONS = [
  { id: 'unheard', label: 'Feeling unheard or dismissed' },
  { id: 'blamed', label: 'Being blamed or criticized' },
  { id: 'abandoned', label: 'Feeling abandoned or shut out' },
  { id: 'controlled', label: 'Feeling controlled or pressured' },
  { id: 'misunderstood', label: 'Being misunderstood' },
];

const TOTAL_STEPS = 3;

interface PartnerDetailsScreenProps {
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export function PartnerDetailsScreen({
  onNext,
  onBack,
  progress,
}: PartnerDetailsScreenProps) {
  const [step, setStep] = useState(0);
  const store = useOnboardingStore();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (step === 0) {
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

  const togglePartnerComm = (id: string) => {
    selectionTap();
    const current = store.partnerCommunicationStyles;
    if (current.includes(id)) {
      store.setField('partnerCommunicationStyles', current.filter((s) => s !== id));
    } else {
      store.setField('partnerCommunicationStyles', [...current, id]);
    }
  };

  const togglePartnerConflict = (id: string) => {
    selectionTap();
    const current = store.partnerConflictFeelings;
    if (current.includes(id)) {
      store.setField('partnerConflictFeelings', current.filter((s) => s !== id));
    } else {
      store.setField('partnerConflictFeelings', [...current, id]);
    }
  };

  const canContinue = () => {
    switch (step) {
      case 0: return store.partnerName.trim().length > 0;
      case 1: return store.partnerCommunicationStyles.length > 0;
      case 2: return store.partnerConflictFeelings.length > 0;
      default: return false;
    }
  };

  const subProgress = progress + (step / TOTAL_STEPS) * (1 / 10);
  const partnerName = store.partnerName || 'your partner';

  const renderPills = (
    options: typeof COMMUNICATION_OPTIONS,
    selected: string[],
    onToggle: (id: string) => void,
  ) => (
    <View style={styles.pillContainer}>
      {options.map((option, index) => {
        const isSelected = selected.includes(option.id);
        return (
          <Animated.View
            key={option.id}
            entering={FadeInDown.duration(400).delay(300 + index * 80)}
          >
            <Pressable
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => onToggle(option.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text
                style={[styles.pillText, isSelected && styles.pillTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Animated.View key="partner-name" entering={FadeInDown.duration(500)}>
            <Text style={styles.title}>
              What's your partner's first name?
            </Text>
            <Text style={styles.subtitle}>
              They'll see their name throughout the experience.
            </Text>
            <TextInput
              ref={inputRef}
              style={styles.nameInput}
              placeholder="Their name"
              placeholderTextColor={colors.textMuted}
              value={store.partnerName}
              onChangeText={(text) => store.setField('partnerName', text)}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => canContinue() && handleNext()}
            />
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View key="partner-comm" entering={FadeInDown.duration(500)}>
            <Text style={styles.title}>
              When {partnerName} is upset, they tend to...
            </Text>
            <Text style={styles.subtitle}>
              Your best guess is enough.
            </Text>
            {renderPills(
              COMMUNICATION_OPTIONS,
              store.partnerCommunicationStyles,
              togglePartnerComm,
            )}
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View key="partner-conflict" entering={FadeInDown.duration(500)}>
            <Text style={styles.title}>
              What do you think hurts {partnerName} most?
            </Text>
            <Text style={styles.subtitle}>
              Understanding this helps create better conversations.
            </Text>
            {renderPills(
              CONFLICT_OPTIONS,
              store.partnerConflictFeelings,
              togglePartnerConflict,
            )}
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Container>
          {renderStep()}
        </Container>
      </ScrollView>

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
  scroll: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.md,
    flexGrow: 1,
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
  nameInput: {
    fontFamily: fontFamilies.body,
    fontSize: 24,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  pillContainer: {
    gap: spacing.sm + 4,
  },
  pill: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  pillSelected: {
    borderColor: colors.orangeMid,
    backgroundColor: colors.orangeTint,
  },
  pillText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pillTextSelected: {
    color: colors.orangeDeep,
    fontFamily: fontFamilies.bodyBold,
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
