/**
 * UnpackingChoiceScreen -- Wait/View choice before unpacking reveal.
 *
 * Design: RelateApp_DesignSpec.md -- updated for warm-light theme.
 * Two choice cards on bgPrimary background with Cormorant display headers.
 *
 * Preserves useUnpacking hook integration: chooseWait / chooseView actions.
 * Auto-navigates to Unpacking if state is already unlocked.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Eye, ArrowLeft } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/feedback/LoadingScreen';
import { useUnpacking } from '../../hooks/useUnpacking';
import { useUIStore } from '../../store/uiStore';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;
type ChoiceRoute = RouteProp<MainNavigatorParamList, 'UnpackingChoice'>;

export function UnpackingChoiceScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ChoiceRoute>();
  const addToast = useUIStore((s) => s.addToast);

  const {
    isLoading,
    isMutating,
    state,
    error,
    chooseWait,
    chooseView,
  } = useUnpacking(route.params.sessionId);

  /** Auto-redirect to Unpacking if already unlocked. */
  useEffect(() => {
    if (!state || state.locked) {
      return;
    }
    navigation.replace('Unpacking', { sessionId: route.params.sessionId });
  }, [navigation, route.params.sessionId, state]);

  useEffect(() => {
    if (error) {
      addToast(error, 'error');
    }
  }, [addToast, error]);

  if (isLoading) {
    return <LoadingScreen message="Preparing your unpacking..." />;
  }

  return (
    <SafeArea>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.eyebrow}>RELATE \u00B7 PHASE 3</Text>
        <Text style={styles.title}>How would you{'\n'}like to view?</Text>
        <Text style={styles.subtitle}>
          Your AI insights are ready. Choose how you'd like to experience them.
        </Text>
      </View>

      <View style={styles.content}>
        {/* Wait together card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Card style={styles.choiceCard} elevated>
            <View style={styles.iconCircle}>
              <Clock size={22} color={colors.orangeMid} />
            </View>
            <Text style={styles.choiceTitle}>Wait for my partner</Text>
            <Text style={styles.choiceBody}>
              We'll unlock together when both of us are ready. This is the recommended experience.
            </Text>
            <Button
              title="Wait together"
              variant="secondary"
              loading={isMutating}
              onPress={chooseWait}
              style={styles.choiceBtn}
            />
          </Card>
        </Animated.View>

        {/* View now card */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Card style={styles.choiceCard} elevated>
            <View style={[styles.iconCircle, { backgroundColor: colors.bgSecondary }]}>
              <Eye size={22} color={colors.textSecondary} />
            </View>
            <Text style={styles.choiceTitle}>View now</Text>
            <Text style={styles.choiceBody}>
              Read insights immediately. Your partner can still join, and auto-unlock runs in 24h if needed.
            </Text>
            <Button
              title="View insights"
              loading={isMutating}
              onPress={async () => {
                await chooseView();
                navigation.replace('Unpacking', { sessionId: route.params.sessionId });
              }}
              style={styles.choiceBtn}
            />
          </Card>
        </Animated.View>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 8,
  },
  eyebrow: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.orangeMid,
    marginBottom: 8,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  choiceCard: {
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  choiceBody: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  choiceBtn: {
    marginTop: 4,
    width: '100%',
  },
});
