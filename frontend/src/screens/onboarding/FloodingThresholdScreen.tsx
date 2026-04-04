/**
 * FloodingThresholdScreen — Captures how quickly the user becomes overwhelmed in conflict.
 *
 * Single-select pill screen asking about emotional flooding threshold.
 * Maps to de-escalation timing strategies in the AI mediator.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing, radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { selectionTap } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FLOODING_OPTIONS = [
  { id: 'immediately', label: 'Almost immediately' },
  { id: 'builds', label: "It builds — but I get there" },
  { id: 'stay_level', label: 'I usually stay pretty level' },
];

/** Animated pill with spring scale on press */
function PillOption({ label, isSelected, onPress, testID }: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  return (
    <AnimatedPressable
      testID={testID}
      style={[
        styles.pill,
        isSelected && styles.pillSelected,
        animStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
    >
      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

interface FloodingThresholdScreenProps {
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export function FloodingThresholdScreen({
  onNext,
  onBack,
  progress,
}: FloodingThresholdScreenProps) {
  const selected = useOnboardingStore((s) => s.floodingThreshold);
  const setField = useOnboardingStore((s) => s.setField);

  const selectOption = (id: string) => {
    selectionTap();
    setField('floodingThreshold', id);
  };

  return (
    <SafeArea testID="screen-root" style={{ backgroundColor: colors.bgPrimary }}>
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
            <Text style={styles.title} accessibilityRole="header">
              How fast do you hit your limit in a fight?
            </Text>
          </Animated.View>

          <View style={styles.pillContainer}>
            {FLOODING_OPTIONS.map((option, index) => {
              const isSelected = selected === option.id;
              return (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.duration(400).delay(300 + index * 80)}
                >
                  <PillOption
                    testID={`pill-${option.id}`}
                    label={option.label}
                    isSelected={isSelected}
                    onPress={() => selectOption(option.id)}
                  />
                </Animated.View>
              );
            })}
          </View>
        </Container>
      </ScrollView>

      <View style={styles.actions}>
        <View style={styles.actionsInner}>
          {selected.length > 0 && (
            <Animated.View entering={FadeInUp.springify().damping(14).duration(400)}>
              <Button
                testID="cta-continue"
                title="Continue"
                onPress={onNext}
                size="lg"
                style={styles.continueBtn}
              />
            </Animated.View>
          )}
          <Button testID="cta-back" title="Back" onPress={onBack} variant="ghost" size="sm" />
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
