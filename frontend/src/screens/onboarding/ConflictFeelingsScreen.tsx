/**
 * ConflictFeelingsScreen — Captures what hurts most during a conflict.
 *
 * Displays a question about emotional pain points during arguments,
 * with multi-select pill options. Helps the AI understand each
 * partner's vulnerability triggers.
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

const CONFLICT_OPTIONS = [
  { id: 'unheard', label: 'Feeling unheard or dismissed' },
  { id: 'blamed', label: 'Being blamed or criticized' },
  { id: 'abandoned', label: 'Feeling abandoned or shut out' },
  { id: 'controlled', label: 'Feeling controlled or pressured' },
  { id: 'misunderstood', label: 'Being misunderstood' },
];

interface ConflictFeelingsScreenProps {
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export function ConflictFeelingsScreen({
  onNext,
  onBack,
  progress,
}: ConflictFeelingsScreenProps) {
  const selected = useOnboardingStore((s) => s.conflictFeelings);
  const setField = useOnboardingStore((s) => s.setField);

  const toggleOption = (id: string) => {
    selectionTap();
    if (selected.includes(id)) {
      setField('conflictFeelings', selected.filter((s) => s !== id));
    } else {
      setField('conflictFeelings', [...selected, id]);
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
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Container>
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={styles.title}>
              In a fight, what hurts most?
            </Text>
            <Text style={styles.subtitle}>
              Select all that apply.
            </Text>
          </Animated.View>

          <View style={styles.pillContainer}>
            {CONFLICT_OPTIONS.map((option, index) => {
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
        <View style={styles.actionsInner}>
          <Button
            title="Continue"
            onPress={onNext}
            disabled={selected.length === 0}
            size="lg"
            style={styles.continueBtn}
          />
          <Button title="Back" onPress={onBack} variant="ghost" size="sm" />
        </View>
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
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.md,
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.bgSecondary,
    backgroundColor: colors.bgPrimary,
  },
  actionsInner: {
    paddingHorizontal: 20,
  },
  continueBtn: {
    marginBottom: spacing.lg,
  },
});
