/**
 * LoveBankScreen — A warm, reflective screen before the conflict section.
 *
 * Transitions from gathering data to acknowledging the love that exists.
 * Captures three things the user loves about their partner, a favorite
 * memory, and relationship strengths via multi-select pills.
 *
 * Uses a subtle warm gradient background (gradientSoft) to feel distinct
 * from the other form screens.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing, radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { selectionTap } from '../../utils/haptics';

const STRENGTH_OPTIONS = [
  { id: 'communication', label: 'Communication' },
  { id: 'humor', label: 'Humor' },
  { id: 'trust', label: 'Trust' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'intimacy', label: 'Intimacy' },
  { id: 'support', label: 'Mutual support' },
  { id: 'respect', label: 'Respect' },
  { id: 'growth', label: 'Growing together' },
];

interface LoveBankScreenProps {
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export function LoveBankScreen({ onNext, onBack, progress }: LoveBankScreenProps) {
  const store = useOnboardingStore();
  const partnerName = store.partnerName || 'your partner';

  const updateLoveReason = (index: 0 | 1 | 2, text: string) => {
    const updated: [string, string, string] = [...store.loveReasons] as [string, string, string];
    updated[index] = text;
    store.setField('loveReasons', updated);
  };

  const toggleStrength = (id: string) => {
    selectionTap();
    const current = store.relationshipStrengths;
    if (current.includes(id)) {
      store.setField('relationshipStrengths', current.filter((s) => s !== id));
    } else {
      store.setField('relationshipStrengths', [...current, id]);
    }
  };

  const hasAtLeastOneReason = store.loveReasons.some((r) => r.trim().length > 0);

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Warm gradient header */}
        <LinearGradient
          colors={colors.gradientSoft}
          style={styles.header}
        >
          <Container>
            <Animated.View entering={FadeInDown.duration(600).delay(200)}>
              <Text style={styles.headerTitle}>
                Before we talk about conflict...
              </Text>
              <Text style={styles.headerSubtitle}>
                Let's remember why you're here.
              </Text>
            </Animated.View>
          </Container>
        </LinearGradient>

        <Container>
          {/* Love reasons */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <Text style={styles.sectionTitle}>
              One thing I love about {partnerName} is...
            </Text>

            {[0, 1, 2].map((index) => (
              <TextInput
                key={index}
                style={styles.loveInput}
                placeholder={
                  index === 0
                    ? 'Their kindness, sense of humor, courage...'
                    : index === 1
                      ? 'Another thing I appreciate...'
                      : 'And one more...'
                }
                placeholderTextColor={colors.textMuted}
                value={store.loveReasons[index]}
                onChangeText={(text) => updateLoveReason(index as 0 | 1 | 2, text)}
              />
            ))}
          </Animated.View>

          {/* Favorite memory */}
          <Animated.View entering={FadeInDown.duration(500).delay(600)}>
            <Text style={styles.sectionTitle}>
              A favorite memory together
            </Text>
            <TextInput
              style={[styles.loveInput, styles.memoryInput]}
              placeholder="That trip to the coast, the night we stayed up talking..."
              placeholderTextColor={colors.textMuted}
              value={store.favoriteMemory}
              onChangeText={(text) => store.setField('favoriteMemory', text)}
              multiline
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Relationship strengths */}
          <Animated.View entering={FadeInDown.duration(500).delay(800)}>
            <Text style={styles.sectionTitle}>
              Our relationship strengths
            </Text>
            <View style={styles.strengthGrid}>
              {STRENGTH_OPTIONS.map((option) => {
                const isSelected = store.relationshipStrengths.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.strengthPill,
                      isSelected && styles.strengthPillSelected,
                    ]}
                    onPress={() => toggleStrength(option.id)}
                  >
                    <Text
                      style={[
                        styles.strengthText,
                        isSelected && styles.strengthTextSelected,
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
            disabled={!hasAtLeastOneReason}
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
    paddingBottom: spacing.lg,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 20,
    color: colors.orangeDeep,
    lineHeight: 28,
  },
  sectionTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  loveInput: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    marginBottom: spacing.sm + 4,
    minHeight: 48,
  },
  memoryInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  strengthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  strengthPill: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  strengthPillSelected: {
    borderColor: colors.orangeMid,
    backgroundColor: colors.orangeTint,
  },
  strengthText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  strengthTextSelected: {
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
