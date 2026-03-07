/**
 * CommitmentsScreen -- "Your Shared Learning" (Phase 5)
 *
 * Design: RelateApp_DesignSpec.md "Commitment / Learning Screen"
 *   - Soft warm gradient background (gradientSoft)
 *   - "Your Shared Learning" Cormorant 36px header
 *   - AI-suggested commitment in decorative card
 *     - Large italic Cormorant serif text
 *     - Attribution: "From your [date] session"
 *   - Both partners agree: checkmark button
 *   - View All Learnings link + Return Home button
 *
 * Preserves useReconnection hook: completeReconnection action.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Heart,
  BookOpen,
  Home,
  ChevronRight,
} from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useReconnection } from '../../hooks/useReconnection';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import { formatDate } from '../../utils/format';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;
type CommitmentsRoute = RouteProp<MainNavigatorParamList, 'Commitments'>;

/**
 * AI-suggested commitments/learnings from the session.
 * In production these would come from the API; placeholder content for now.
 */
const AI_LEARNING = {
  text: 'When I feel unheard, I will name my need instead of withdrawing. When you feel overwhelmed, you will ask for a pause instead of shutting down.',
  date: new Date().toISOString(),
};

export function CommitmentsScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<CommitmentsRoute>();
  const addToast = useUIStore((s) => s.addToast);

  const { completeReconnection, loading } = useReconnection(
    route.params.sessionId,
    'Partner',
  );

  const [agreed, setAgreed] = useState(false);
  const [saved, setSaved] = useState(false);

  const sessionDate = useMemo(() => formatDate(AI_LEARNING.date), []);

  const handleAgree = () => {
    setAgreed(true);
  };

  const handleSave = async () => {
    try {
      await completeReconnection();
      setSaved(true);
      addToast('Learning saved. You are both growing.', 'success');
    } catch {
      addToast('Could not save learning yet.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradientSoft}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeArea style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Decorative drag handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={styles.headerIconRow}>
              <Heart size={20} color={colors.orangeMid} fill={colors.orangeMid} />
            </View>
            <Text style={styles.headerTitle}>Your Shared{'\n'}Learning</Text>
            <Text style={styles.headerSubtitle}>
              Small commitments create lasting change.
            </Text>
          </Animated.View>

          {/* AI-suggested learning card */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Card style={styles.learningCard} elevated>
              <View style={styles.learningDecor}>
                <View style={styles.quoteMark}>
                  <Text style={styles.quoteMarkText}>"</Text>
                </View>
              </View>
              <Text style={styles.learningText}>{AI_LEARNING.text}</Text>
              <View style={styles.attributionRow}>
                <BookOpen size={12} color={colors.textMuted} />
                <Text style={styles.attributionText}>
                  From your {sessionDate} session
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* Agreement section */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.agreeSection}>
            {!agreed ? (
              <Pressable onPress={handleAgree} style={styles.agreeBtn}>
                <View style={styles.checkbox}>
                  <Check size={14} color={colors.textInverse} strokeWidth={3} />
                </View>
                <Text style={styles.agreeLabel}>I agree to remember this</Text>
              </Pressable>
            ) : (
              <Animated.View entering={FadeIn.duration(400)} style={styles.agreedRow}>
                <View style={[styles.checkbox, styles.checkboxChecked]}>
                  <Check size={14} color={colors.textInverse} strokeWidth={3} />
                </View>
                <Text style={styles.agreedLabel}>You've agreed</Text>
              </Animated.View>
            )}

            {agreed && !saved && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Text style={styles.waitingText}>
                  Waiting for your partner to agree too...
                </Text>
              </Animated.View>
            )}

            {saved && (
              <Animated.View entering={FadeIn.duration(600)} style={styles.savedBadge}>
                <Heart size={14} color={colors.success} fill={colors.success} />
                <Text style={styles.savedText}>Both partners agreed. Learning saved.</Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Bottom actions */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.actions}>
            {agreed && (
              <Button
                title="Save & Continue"
                onPress={handleSave}
                loading={loading}
                style={styles.saveBtn}
              />
            )}

            <Pressable
              onPress={() => {
                // Navigate to LearningsHistory when it exists
                navigation.navigate('HomeTabs');
              }}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>View All Learnings</Text>
              <ChevronRight size={16} color={colors.orangeMid} />
            </Pressable>

            <Button
              title="Return Home"
              variant="ghost"
              icon={<Home size={16} color={colors.orangeMid} />}
              onPress={() => navigation.navigate('HomeTabs')}
              style={styles.homeBtn}
            />
          </Animated.View>
        </ScrollView>
      </SafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ---- Drag handle ----
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },

  // ---- Header ----
  header: {
    marginBottom: 28,
  },
  headerIconRow: {
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // ---- Learning card ----
  learningCard: {
    padding: 28,
    marginBottom: 24,
  },
  learningDecor: {
    marginBottom: 8,
  },
  quoteMark: {
    width: 32,
    height: 32,
  },
  quoteMarkText: {
    fontFamily: fontFamilies.display,
    fontSize: 56,
    lineHeight: 56,
    color: colors.orangeLight,
  },
  learningText: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 22,
    lineHeight: 34,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attributionText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
  },

  // ---- Agreement ----
  agreeSection: {
    marginBottom: 24,
    gap: 12,
  },
  agreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: colors.orangeMid,
    borderColor: colors.orangeMid,
  },
  agreeLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  agreedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.orangeTint,
    borderRadius: radius.md,
    padding: 16,
  },
  agreedLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    color: colors.orangeDeep,
  },
  waitingText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.safe,
    borderRadius: radius.md,
    padding: 14,
    justifyContent: 'center',
  },
  savedText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    color: colors.success,
  },

  // ---- Actions ----
  actions: {
    gap: 12,
  },
  saveBtn: {
    width: '100%',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  linkText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.orangeMid,
  },
  homeBtn: {
    width: '100%',
  },
});
