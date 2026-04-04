/**
 * UsProfileScreen -- "Us" couple profile screen
 *
 * Design: RelateApp_DesignSpec.md "'Us' Profile Screen"
 *   - Orange gradient header (gradientHero) with overlapping partner avatars
 *   - "[Name] & [Partner]" + "Together since [date]"
 *   - Relationship Health: 3 metric cards
 *   - Your Love Bank: scrollable cards with [+ Add a moment] button
 *   - Shared Learnings: saved commitments with dates
 *   - Your Story: first date, how you met
 *   - Bottom: Settings / Privacy / Notification links
 *
 * Used as the "Us" tab in bottom navigation and also accessible from the stack.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Settings,
  Shield,
  Bell,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useSessionList } from '../../hooks/useSession';
import { formatDate } from '../../utils/format';
import {
  getCoupleStats,
  getLoveBank,
  getLearnings,
  type CoupleStatsResponse,
  type LoveBankEntryResponse,
  type LearningResponse,
} from '../../services/couples';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

export function UsProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((s) => s.user);
  const couple = useAuthStore((s) => s.couple);
  const { sessions } = useSessionList();

  const userName = user?.name || 'You';
  const isUserA = user?.id === couple?.userAId;
  const partnerName = isUserA
    ? (couple?.userB?.name || 'Partner')
    : (couple?.userA?.name || 'Partner');
  const togetherSince = couple?.datingStartDate || (couple?.createdAt ? formatDate(couple.createdAt) : 'Recently');

  // ─── API-driven stats ─────────────────────────────────────────────
  const [apiStats, setApiStats] = useState<CoupleStatsResponse | null>(null);
  const [loveBankEntries, setLoveBankEntries] = useState<LoveBankEntryResponse[]>([]);
  const [apiLearnings, setApiLearnings] = useState<LearningResponse[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [statsData, lbData, learnData] = await Promise.all([
          getCoupleStats().catch(() => null),
          getLoveBank().catch(() => []),
          getLearnings().catch(() => []),
        ]);
        if (!cancelled) {
          setApiStats(statsData);
          setLoveBankEntries(lbData);
          setApiLearnings(learnData);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const localTogetherDays = useMemo(() => {
    const dateStr = couple?.datingStartDate || couple?.createdAt;
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
  }, [couple?.datingStartDate, couple?.createdAt]);

  const togetherDays = apiStats?.togetherSinceDays ?? localTogetherDays;

  const stats = useMemo(() => {
    if (apiStats) {
      return {
        mediationsCompleted: apiStats.sessionsCompleted,
        commitmentsKept: apiStats.commitmentsKept,
        daysSinceLastSession: apiStats.daysSinceLastSession,
      };
    }
    // Fallback to local computation if API failed
    const resolvedSessions = sessions.filter(s => s.status === 'resolved');
    const mediations = resolvedSessions.length;
    const lastSession = sessions[0];
    const daysSince = lastSession
      ? Math.floor((Date.now() - new Date(lastSession.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { mediationsCompleted: mediations, commitmentsKept: 0, daysSinceLastSession: daysSince };
  }, [apiStats, sessions]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero gradient header */}
        <LinearGradient
          colors={colors.gradientHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeader}
        >
          {/* Settings button in top-right */}
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsBtn}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Settings size={22} color={colors.textInverse} strokeWidth={1.8} />
          </Pressable>

          {/* Overlapping avatars */}
          <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.avatarRow}>
            <Avatar name={userName} size="xl" partnerRole={isUserA ? "A" : "B"} />
            <Avatar
              name={partnerName}
              size="xl"
              partnerRole={isUserA ? "B" : "A"}
              style={styles.avatarOverlap}
            />
          </Animated.View>

          {/* Names */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={styles.heroTitle} accessibilityRole="header">{userName} & {partnerName}</Text>
            <Text style={styles.heroSubtitle}>Together since {togetherSince}</Text>
          </Animated.View>

          {/* Heartbeats stat */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.heartbeatRow}>
            <Heart size={14} color={colors.textInverse} fill={colors.textInverse} />
            <Text style={styles.heartbeatText}>
              {stats.mediationsCompleted + stats.commitmentsKept} heartbeats
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* Main content on bgPrimary */}
        <View style={styles.body}>
          {/* Relationship Health section */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <Text style={styles.sectionTitle}>Relationship Health</Text>
            <View style={styles.metricsRow}>
              <MetricCard
                icon={<Sparkles size={18} color={colors.orangeMid} />}
                value={stats.mediationsCompleted}
                label="Mediations"
              />
              <MetricCard
                icon={<CheckCircle size={18} color={colors.success} />}
                value={stats.commitmentsKept}
                label="Commitments kept"
              />
              <MetricCard
                icon={<Clock size={18} color={colors.partnerB} />}
                value={stats.daysSinceLastSession}
                label="Days since last"
              />
            </View>
            <Text style={styles.encouragement}>
              You're doing the work. That means everything.
            </Text>
          </Animated.View>

          {/* Love Bank section */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)}>
            <Text style={styles.sectionTitle}>Your Love Bank</Text>
            {loveBankEntries.length > 0 ? (
              <Pressable onPress={() => navigation.navigate('LoveBank')} accessibilityLabel="View love bank" accessibilityRole="button">
                <Card style={styles.previewCard} elevated>
                  <Heart size={14} color={colors.orangeLight} fill={colors.orangeLight} />
                  <Text style={styles.previewText} numberOfLines={2}>
                    {loveBankEntries[0].text}
                  </Text>
                  <Text style={styles.previewCount}>
                    {loveBankEntries.length} moment{loveBankEntries.length !== 1 ? 's' : ''} saved
                  </Text>
                </Card>
              </Pressable>
            ) : (
              <Text style={styles.emptyHint}>No moments yet</Text>
            )}
            <Button
              title="Add a moment"
              variant="secondary"
              icon={<Plus size={16} color={colors.orangeMid} />}
              onPress={() => navigation.navigate('LoveBank')}
              size="sm"
              style={styles.addMomentBtn}
            />
          </Animated.View>

          {/* Shared Learnings section */}
          <Animated.View entering={FadeInDown.delay(700).duration(500)}>
            <Text style={styles.sectionTitle}>Shared Learnings</Text>
            {apiLearnings.length > 0 ? (
              <Pressable onPress={() => navigation.navigate('LearningsHistory')} accessibilityLabel="View shared learnings" accessibilityRole="button">
                <Card style={styles.previewCard} elevated>
                  <Sparkles size={14} color={colors.orangeMid} />
                  <Text style={styles.previewText} numberOfLines={2}>
                    {apiLearnings[0].text}
                  </Text>
                  <Text style={styles.previewCount}>
                    {apiLearnings.length} learning{apiLearnings.length !== 1 ? 's' : ''} saved
                  </Text>
                </Card>
              </Pressable>
            ) : (
              <Text style={styles.emptyHint}>Complete your first session to see learnings here.</Text>
            )}
          </Animated.View>

          {/* Your Story section */}
          <Animated.View entering={FadeInDown.delay(800).duration(500)}>
            <Text style={styles.sectionTitle}>Your Story</Text>
            <Card style={styles.storyCard} elevated>
              <View style={styles.storyRow}>
                <Calendar size={16} color={colors.textMuted} />
                <View style={styles.storyContent}>
                  <Text style={styles.storyLabel}>Together since</Text>
                  <Text style={styles.storyValue}>
                    {togetherSince}{togetherDays !== null ? ` (${togetherDays} days)` : ''}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.addStoryLink} accessibilityLabel="Add your story details" accessibilityRole="button">
                <Plus size={14} color={colors.orangeMid} />
                <Text style={styles.addStoryText}>Add your story details</Text>
              </Pressable>
            </Card>
          </Animated.View>

          {/* Bottom links */}
          <Animated.View entering={FadeInDown.delay(900).duration(500)} style={styles.bottomLinks}>
            <BottomLink
              icon={<Settings size={16} color={colors.textSecondary} />}
              label="Settings"
              onPress={() => navigation.navigate('Settings')}
            />
            <BottomLink
              icon={<Shield size={16} color={colors.textSecondary} />}
              label="Privacy"
              onPress={() => {}}
            />
            <BottomLink
              icon={<Bell size={16} color={colors.textSecondary} />}
              label="Notifications"
              onPress={() => {}}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Compact metric card for relationship health section. */
function MetricCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string | null;
  label: string;
}) {
  return (
    <Card style={styles.metricCard} elevated>
      {icon}
      <Text style={styles.metricValue}>{value ?? '-'}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

/** Bottom settings link row. */
function BottomLink({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.bottomLinkRow} accessibilityLabel={label} accessibilityRole="button">
      {icon}
      <Text style={styles.bottomLinkText}>{label}</Text>
      <ChevronRight size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ---- Hero header ----
  heroHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  settingsBtn: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarOverlap: {
    marginLeft: -20,
  },
  heroTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  heartbeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heartbeatText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    color: colors.textInverse,
  },

  // ---- Body ----
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // ---- Section titles ----
  sectionTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },

  // ---- Metrics ----
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    color: colors.textPrimary,
  },
  metricLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  encouragement: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    fontStyle: 'italic',
  },

  // ---- Love Bank / Learnings ----
  addMomentBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 28,
  },
  emptyHint: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  previewCard: {
    gap: 8,
    padding: 16,
    marginBottom: 4,
  },
  previewText: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  previewCount: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
  },

  // ---- Story ----
  storyCard: {
    gap: 14,
    marginBottom: 28,
  },
  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storyContent: {
    flex: 1,
  },
  storyLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  storyValue: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: 2,
  },
  addStoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  addStoryText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.orangeMid,
  },

  // ---- Bottom links ----
  bottomLinks: {
    gap: 0,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
    ...shadows.sm,
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bottomLinkText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
});
