/**
 * ConflictPreferencesScreen — Gathers conflict resolution preferences.
 *
 * Three sections:
 *   1. Resolution speed — how quickly the user prefers to resolve conflicts
 *   2. Attachment style — simplified attachment theory self-identification
 *   3. Past conflict patterns — recurring issues in the relationship
 *
 * Single-select radio for sections 1 and 2, multi-select pills for section 3.
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

const RESOLUTION_OPTIONS = [
  { id: 'fast', label: 'I want to fix it right away', desc: 'Same day' },
  { id: 'medium', label: 'I need a little time to cool off', desc: 'A day or two' },
  { id: 'slow', label: 'I need space before I can talk', desc: 'Several days' },
];

const ATTACHMENT_OPTIONS = [
  { id: 'secure', label: 'Secure', desc: 'I feel comfortable with closeness and independence' },
  { id: 'anxious', label: 'Anxious', desc: 'I worry about being abandoned or not loved enough' },
  { id: 'avoidant', label: 'Avoidant', desc: 'I tend to pull away when things get too close' },
  { id: 'unsure', label: 'Not sure', desc: "I don't know my attachment style" },
];

const PATTERN_OPTIONS = [
  { id: 'same-fight', label: 'Same fight, different day' },
  { id: 'stonewalling', label: 'Stonewalling / silent treatment' },
  { id: 'escalation', label: 'Things escalate quickly' },
  { id: 'score-keeping', label: 'Keeping score of past wrongs' },
  { id: 'avoidance', label: 'Avoiding hard conversations' },
  { id: 'blame', label: 'Blame and defensiveness' },
];

interface ConflictPreferencesScreenProps {
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export function ConflictPreferencesScreen({
  onNext,
  onBack,
  progress,
}: ConflictPreferencesScreenProps) {
  const store = useOnboardingStore();

  const togglePattern = (id: string) => {
    selectionTap();
    const current = store.pastConflictPatterns;
    if (current.includes(id)) {
      store.setField('pastConflictPatterns', current.filter((s) => s !== id));
    } else {
      store.setField('pastConflictPatterns', [...current, id]);
    }
  };

  const canContinue =
    store.resolutionSpeed.length > 0 && store.attachmentStyle.length > 0;

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }} edges={['top']}>
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
          {/* Section 1: Resolution Speed */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <Text style={styles.sectionTitle}>
              When there's conflict, how quickly do you want to resolve it?
            </Text>

            <View style={styles.optionList}>
              {RESOLUTION_OPTIONS.map((option) => {
                const isSelected = store.resolutionSpeed === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.radioCard, isSelected && styles.radioCardSelected]}
                    onPress={() => {
                      selectionTap();
                      store.setField('resolutionSpeed', option.id);
                    }}
                  >
                    <View style={styles.radioRow}>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.radioContent}>
                        <Text
                          style={[
                            styles.radioLabel,
                            isSelected && styles.radioLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={styles.radioDesc}>{option.desc}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Section 2: Attachment Style */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Text style={styles.sectionTitle}>
              Which best describes you in relationships?
            </Text>

            <View style={styles.optionList}>
              {ATTACHMENT_OPTIONS.map((option) => {
                const isSelected = store.attachmentStyle === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.radioCard, isSelected && styles.radioCardSelected]}
                    onPress={() => {
                      selectionTap();
                      store.setField('attachmentStyle', option.id);
                    }}
                  >
                    <View style={styles.radioRow}>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.radioContent}>
                        <Text
                          style={[
                            styles.radioLabel,
                            isSelected && styles.radioLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={styles.radioDesc}>{option.desc}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Section 3: Past Conflict Patterns */}
          <Animated.View entering={FadeInDown.duration(500).delay(600)}>
            <Text style={styles.sectionTitle}>
              Patterns that show up in your relationship
            </Text>
            <Text style={styles.sectionSubtitle}>
              Select any that feel familiar. Optional.
            </Text>

            <View style={styles.patternGrid}>
              {PATTERN_OPTIONS.map((option) => {
                const isSelected = store.pastConflictPatterns.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.patternPill,
                      isSelected && styles.patternPillSelected,
                    ]}
                    onPress={() => togglePattern(option.id)}
                  >
                    <Text
                      style={[
                        styles.patternText,
                        isSelected && styles.patternTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Container>
      </ScrollView>

      <View style={styles.actions}>
        <Container>
          <Button
            title="Continue"
            onPress={onNext}
            disabled={!canContinue}
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  optionList: {
    gap: spacing.sm + 4,
  },
  radioCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  radioCardSelected: {
    borderColor: colors.orangeMid,
    backgroundColor: colors.orangeTint,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: colors.orangeMid,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.orangeMid,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  radioLabelSelected: {
    color: colors.orangeDeep,
  },
  radioDesc: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  patternPill: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  patternPillSelected: {
    borderColor: colors.orangeMid,
    backgroundColor: colors.orangeTint,
  },
  patternText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  patternTextSelected: {
    color: colors.orangeDeep,
    fontFamily: fontFamilies.bodyBold,
  },
  actions: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.bgSecondary,
    backgroundColor: colors.bgPrimary,
  },
  continueBtn: {
    marginBottom: spacing.sm,
  },
});
