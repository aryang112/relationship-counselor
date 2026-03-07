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

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
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
  BookOpen,
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
import { formatDate } from '../../utils/format';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Placeholder data -- in production these would come from the API.
 */
const MOCK_STATS = {
  mediationsCompleted: 3,
  commitmentsKept: 7,
  daysSinceLastSession: 2,
};

const MOCK_LOVE_BANK = [
  { id: '1', text: 'Made breakfast together on Sunday', date: '2026-03-05' },
  { id: '2', text: 'Long walk in the park, talked about dreams', date: '2026-03-01' },
  { id: '3', text: 'Surprise flowers after a hard week', date: '2026-02-20' },
];

const MOCK_LEARNINGS = [
  { id: '1', text: 'Name my need instead of withdrawing.', date: '2026-03-04' },
  { id: '2', text: 'Ask for a pause instead of shutting down.', date: '2026-02-28' },
];

export function UsProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((s) => s.user);
  const couple = useAuthStore((s) => s.couple);

  const userName = user?.name || 'You';
  const partnerName = couple?.userB?.name || 'Partner';
  const togetherSince = couple?.createdAt ? formatDate(couple.createdAt) : 'Recently';

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
          >
            <Settings size={22} color={colors.textInverse} strokeWidth={1.8} />
          </Pressable>

          {/* Overlapping avatars */}
          <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.avatarRow}>
            <Avatar name={userName} size="xl" partnerRole="A" />
            <Avatar
              name={partnerName}
              size="xl"
              partnerRole="B"
              style={styles.avatarOverlap}
            />
          </Animated.View>

          {/* Names */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={styles.heroTitle}>{userName} & {partnerName}</Text>
            <Text style={styles.heroSubtitle}>Together since {togetherSince}</Text>
          </Animated.View>

          {/* Heartbeats stat */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.heartbeatRow}>
            <Heart size={14} color={colors.textInverse} fill={colors.textInverse} />
            <Text style={styles.heartbeatText}>
              {MOCK_STATS.mediationsCompleted + MOCK_STATS.commitmentsKept} heartbeats
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
                value={MOCK_STATS.mediationsCompleted}
                label="Mediations"
              />
              <MetricCard
                icon={<CheckCircle size={18} color={colors.success} />}
                value={MOCK_STATS.commitmentsKept}
                label="Commitments kept"
              />
              <MetricCard
                icon={<Clock size={18} color={colors.partnerB} />}
                value={MOCK_STATS.daysSinceLastSession}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.loveBankScroll}
            >
              {MOCK_LOVE_BANK.map((entry) => (
                <Card key={entry.id} style={styles.loveBankCard} elevated>
                  <Heart size={14} color={colors.orangeLight} fill={colors.orangeLight} />
                  <Text style={styles.loveBankText}>{entry.text}</Text>
                  <Text style={styles.loveBankDate}>{formatDate(entry.date)}</Text>
                </Card>
              ))}
            </ScrollView>
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
            {MOCK_LEARNINGS.map((learning) => (
              <View key={learning.id} style={styles.learningRow}>
                <BookOpen size={16} color={colors.orangeMid} />
                <View style={styles.learningContent}>
                  <Text style={styles.learningText}>{learning.text}</Text>
                  <Text style={styles.learningDate}>{formatDate(learning.date)}</Text>
                </View>
              </View>
            ))}
            <Pressable
              style={styles.viewAllLink}
              onPress={() => navigation.navigate('LearningsHistory')}
            >
              <Text style={styles.viewAllText}>View all learnings</Text>
              <ChevronRight size={16} color={colors.orangeMid} />
            </Pressable>
          </Animated.View>

          {/* Your Story section */}
          <Animated.View entering={FadeInDown.delay(800).duration(500)}>
            <Text style={styles.sectionTitle}>Your Story</Text>
            <Card style={styles.storyCard} elevated>
              <View style={styles.storyRow}>
                <Calendar size={16} color={colors.textMuted} />
                <View style={styles.storyContent}>
                  <Text style={styles.storyLabel}>Together since</Text>
                  <Text style={styles.storyValue}>{togetherSince}</Text>
                </View>
              </View>
              <Pressable style={styles.addStoryLink}>
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
  value: number;
  label: string;
}) {
  return (
    <Card style={styles.metricCard} elevated>
      {icon}
      <Text style={styles.metricValue}>{value}</Text>
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
    <Pressable onPress={onPress} style={styles.bottomLinkRow}>
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

  // ---- Love Bank ----
  loveBankScroll: {
    paddingRight: 24,
    gap: 12,
  },
  loveBankCard: {
    width: SCREEN_WIDTH * 0.55,
    padding: 16,
    gap: 8,
  },
  loveBankText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  loveBankDate: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  addMomentBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 28,
  },

  // ---- Learnings ----
  learningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  learningContent: {
    flex: 1,
  },
  learningText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  learningDate: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    justifyContent: 'center',
    marginBottom: 20,
  },
  viewAllText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.orangeMid,
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
