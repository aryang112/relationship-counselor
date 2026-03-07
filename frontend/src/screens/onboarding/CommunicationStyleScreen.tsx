/**
 * CommunicationStyleScreen — Captures user's communication tendencies.
 *
 * Displays a question about how the user behaves when upset, with
 * multi-select pill options. The user can select multiple styles
 * that resonate with them.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing, radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { selectionTap } from '../../utils/haptics';

const COMMUNICATION_OPTIONS = [
  { id: 'withdraw', label: 'I withdraw and go quiet' },
  { id: 'talk', label: 'I need to talk it out immediately' },
  { id: 'analyze', label: 'I overthink and analyze everything' },
  { id: 'emotional', label: 'I get emotional and reactive' },
  { id: 'avoid', label: 'I avoid the topic entirely' },
];

interface CommunicationStyleScreenProps {
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export function CommunicationStyleScreen({
  onNext,
  onBack,
  progress,
}: CommunicationStyleScreenProps) {
  const selected = useOnboardingStore((s) => s.communicationStyles);
  const setField = useOnboardingStore((s) => s.setField);

  const toggleOption = (id: string) => {
    selectionTap();
    if (selected.includes(id)) {
      setField('communicationStyles', selected.filter((s) => s !== id));
    } else {
      setField('communicationStyles', [...selected, id]);
    }
  };

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Container>
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={styles.title}>
              When you're upset, you tend to...
            </Text>
            <Text style={styles.subtitle}>
              Select all that apply.
            </Text>
          </Animated.View>

          <View style={styles.pillContainer}>
            {COMMUNICATION_OPTIONS.map((option, index) => {
              const isSelected = selected.includes(option.id);
              return (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.duration(400).delay(300 + index * 80)}
                >
                  <Pressable
                    style={[
                      styles.pill,
                      isSelected && styles.pillSelected,
                    ]}
                    onPress={() => toggleOption(option.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isSelected && styles.pillTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Container>
      </ScrollView>

      <View style={styles.actions}>
        <Container>
          <Button
            title="Continue"
            onPress={onNext}
            disabled={selected.length === 0}
            size="lg"
            style={styles.continueBtn}
          />
          <Button title="Back" onPress={onBack} variant="ghost" />
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
  continueBtn: {
    marginBottom: spacing.sm,
  },
});
