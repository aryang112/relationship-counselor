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
 * Wired to real API: generates commitment on mount, handles agreement
 * from both partners, and completes the session when both agree.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/format';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;
type CommitmentsRoute = RouteProp<MainNavigatorParamList, 'Commitments'>;

export function CommitmentsScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<CommitmentsRoute>();
  const addToast = useUIStore((s) => s.addToast);
  const couple = useAuthStore((s) => s.couple);

  const partnerName = couple?.userB?.name || 'Your partner';

  const {
    commitment,
    loading,
    generateCommitment,
    agreeToCommitment,
    completeReconnection,
  } = useReconnection(route.params.sessionId, partnerName);

  const [generatingCommitment, setGeneratingCommitment] = useState(false);
  const [agreeing, setAgreeing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saved, setSaved] = useState(false);

  const sessionDate = useMemo(() => formatDate(new Date().toISOString()), []);

  // On mount, if no commitment exists, generate one
  useEffect(() => {
    if (!loading && !commitment && !generatingCommitment) {
      setGeneratingCommitment(true);
      generateCommitment().finally(() => setGeneratingCommitment(false));
    }
  }, [loading, commitment, generateCommitment, generatingCommitment]);

  const myAgreed = commitment?.userAAgreed || false;
  const partnerAgreed = commitment?.userBAgreed || false;
  const bothAgreed = myAgreed && partnerAgreed;

  const handleAgree = async () => {
    setAgreeing(true);
    try {
      await agreeToCommitment();
    } catch {
      addToast('Could not record your agreement.', 'error');
    } finally {
      setAgreeing(false);
    }
  };

  const handleSave = async () => {
    setCompleting(true);
    try {
      await completeReconnection();
      setSaved(true);
      addToast('Learning saved. You are both growing.', 'success');
    } catch {
      addToast('Could not save learning yet.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const isLoading = loading || generatingCommitment;

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
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.orangeMid} />
                  <Text style={styles.loadingText}>Generating your shared learning...</Text>
                </View>
              ) : (
                <Text style={styles.learningText}>
                  {commitment?.text || 'Your shared learning will appear here after the AI generates it.'}
                </Text>
              )}
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
            {/* My agreement */}
            {!myAgreed ? (
              <Pressable
                onPress={handleAgree}
                disabled={isLoading || !commitment || agreeing}
                style={[styles.agreeBtn, (isLoading || !commitment) && styles.agreeBtnDisabled]}
              >
                <View style={styles.checkbox}>
                  <Check size={14} color={colors.textInverse} strokeWidth={3} />
                </View>
                <Text style={styles.agreeLabel}>
                  {agreeing ? 'Agreeing...' : 'I agree to remember this'}
                </Text>
              </Pressable>
            ) : (
              <Animated.View entering={FadeIn.duration(400)} style={styles.agreedRow}>
                <View style={[styles.checkbox, styles.checkboxChecked]}>
                  <Check size={14} color={colors.textInverse} strokeWidth={3} />
                </View>
                <Text style={styles.agreedLabel}>You've agreed</Text>
              </Animated.View>
            )}

            {/* Partner agreement status */}
            {myAgreed && !bothAgreed && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Text style={styles.waitingText}>
                  Waiting for {partnerName} to agree...
                </Text>
              </Animated.View>
            )}

            {partnerAgreed && !myAgreed && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.partnerAgreedRow}>
                <Check size={14} color={colors.success} strokeWidth={3} />
                <Text style={styles.partnerAgreedText}>
                  {partnerName} has agreed
                </Text>
              </Animated.View>
            )}

            {bothAgreed && !saved && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.savedBadge}>
                <Heart size={14} color={colors.success} fill={colors.success} />
                <Text style={styles.savedText}>Both partners agreed!</Text>
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
            {bothAgreed && !saved && (
              <Button
                title="Save & Complete"
                onPress={handleSave}
                loading={completing}
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
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
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
  agreeBtnDisabled: {
    opacity: 0.5,
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
  partnerAgreedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  partnerAgreedText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.success,
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
