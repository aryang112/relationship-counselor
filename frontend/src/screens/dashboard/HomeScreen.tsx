/**
 * HomeScreen — Primary dashboard for the Relate app.
 *
 * Design System: RelateApp_DesignSpec.md §4 "Home Screen"
 *
 * Layout:
 *   - ScrollView with warm bgPrimary background
 *   - Orange gradient hero card with greeting, partner info, relationship stats
 *   - Main CTA card ("Start a Mediation") with emoji icon
 *   - Love Bank rotating quote card (orangeTint bg, orangeMid border)
 *   - Recent sessions section
 *   - Quick actions pill row
 *
 * Preserves all existing hook integrations (useSessionList, useAuthStore).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Settings, BookOpen, MessageCircle, Zap } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SessionCard } from '../../components/domain/SessionCard';
import { useSessionList } from '../../hooks/useSession';
import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { createInvite } from '../../services/auth';
import { successTap, lightTap } from '../../utils/haptics';
import { formatDate } from '../../utils/format';
import type { Session } from '../../types/session';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;

/** Love Bank affirmation quotes shown on a rotating basis */
const LOVE_BANK_QUOTES = [
  '"The small things are never small when it comes to love."',
  '"Every act of kindness is a deposit into your relationship."',
  '"You chose each other. That matters."',
  '"Love is not about perfection — it is about showing up."',
  '"The strongest couples are the ones who fight for each other, not with each other."',
];

function isActive(status: Session['status']) {
  return status !== 'resolved' && status !== 'abandoned';
}

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((s) => s.user);
  const couple = useAuthStore((s) => s.couple);
  const { sessions, refresh } = useSessionList();
  const addToast = useUIStore((s) => s.addToast);
  const setCouple = useAuthStore((s) => s.setCouple);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Love Bank rotating quote
  const [quoteIndex, setQuoteIndex] = useState(0);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setQuoteIndex((prev) => (prev + 1) % LOVE_BANK_QUOTES.length);
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  const hasCoupleFormed = couple && couple.userBId;

  const handleInvitePartner = useCallback(async () => {
    setInviteLoading(true);
    try {
      const res = await createInvite();
      setCouple(res.couple);
      await Share.share({
        message: `Join me on Relate so we can strengthen our relationship together. Use this invite code: ${res.inviteToken}`,
      });
      successTap();
    } catch (err: any) {
      if (!err?.response) {
        addToast('Could not reach the server. Check your connection.', 'error');
      } else {
        const msg = err?.response?.data?.message;
        if (msg) addToast(Array.isArray(msg) ? msg[0] : msg, 'error');
      }
    } finally {
      setInviteLoading(false);
    }
  }, [setCouple, addToast]);

  const activeSession = useMemo(
    () => sessions.find((item) => isActive(item.status)) || null,
    [sessions],
  );

  const pastSessions = useMemo(
    () => sessions.filter((item) => !activeSession || item.id !== activeSession.id).slice(0, 3),
    [activeSession, sessions],
  );

  const getCompletion = useCallback(
    (session: Session) => {
      const interviews = session.interviews || [];
      const userAId = couple?.userAId;
      const userBId = couple?.userBId;
      const userAComplete = Boolean(
        userAId && interviews.some((it) => it.userId === userAId && !!it.completedAt),
      );
      const userBComplete = Boolean(
        userBId && interviews.some((it) => it.userId === userBId && !!it.completedAt),
      );
      return { userAComplete, userBComplete };
    },
    [couple?.userAId, couple?.userBId],
  );

  const handleOpenSession = useCallback(
    (session: Session) => {
      navigation.navigate('SessionDetail', { id: session.id });
    },
    [navigation],
  );

  const firstName = user?.name?.split(' ')[0] || 'there';
  const partnerName = couple?.userB?.name?.split(' ')[0] || couple?.userA?.name?.split(' ')[0] || 'Partner';

  // Calculate "together" days if couple exists
  const togetherDays = useMemo(() => {
    if (!couple?.createdAt) return null;
    const diff = Date.now() - new Date(couple.createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [couple?.createdAt]);

  return (
    <SafeArea>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={refresh}
      >
        {/* ── Hero Gradient Card ── */}
        <LinearGradient
          colors={colors.gradientHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Avatar
                name={user?.name || 'You'}
                size="md"
                partnerRole="A"
              />
              <View style={styles.topBarGreeting}>
                <Text style={styles.helloText}>Hello, {firstName}</Text>
                <Text style={styles.helloEmoji}> 👋</Text>
              </View>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsBtn}
              accessibilityLabel="Open settings"
            >
              <Settings color="#FFFFFF" size={20} strokeWidth={1.8} />
            </Pressable>
          </View>

          {/* Partner + relationship stats */}
          <View style={styles.heroStats}>
            {hasCoupleFormed && (
              <View style={styles.partnerRow}>
                <Avatar name={couple?.userB?.name || 'Partner'} size="sm" partnerRole="B" />
                <Text style={styles.partnerInfo}>
                  {partnerName} is connected
                </Text>
              </View>
            )}
            {togetherDays !== null && (
              <Text style={styles.togetherText}>
                Together {togetherDays} days  ❤️
              </Text>
            )}
          </View>

          {/* Stats summary */}
          <View style={styles.heroFooter}>
            <Text style={styles.heroStat}>
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} completed
            </Text>
          </View>
        </LinearGradient>

        {/* ── Body ── */}
        <View style={styles.body}>
          {/* Invite banner */}
          {!hasCoupleFormed && (
            <Pressable
              onPress={handleInvitePartner}
              disabled={inviteLoading}
              style={styles.inviteBanner}
            >
              {inviteLoading ? (
                <ActivityIndicator size="small" color={colors.orangeMid} style={{ marginRight: 10 }} />
              ) : null}
              <Text style={styles.inviteBannerText}>
                {inviteLoading ? 'Generating invite...' : 'Invite your partner to get started'}
              </Text>
              {!inviteLoading && <ChevronRight color={colors.orangeMid} size={18} />}
            </Pressable>
          )}

          {/* ── Main CTA Card: Start a Mediation ── */}
          <Pressable
            onPress={() => {
              lightTap();
              navigation.navigate('StartMediation');
            }}
            style={({ pressed }) => [
              styles.ctaCard,
              pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
            ]}
          >
            <View style={styles.ctaLeft}>
              <View style={styles.ctaIconWrap}>
                <Text style={styles.ctaEmoji}>🫂</Text>
              </View>
              <View style={styles.ctaTextWrap}>
                <Text style={styles.ctaTitle}>Start a Mediation</Text>
                <Text style={styles.ctaSub}>
                  Something feels off? Let's work through it together.
                </Text>
              </View>
            </View>
            <View style={styles.ctaArrow}>
              <ChevronRight color={colors.orangeMid} size={22} />
            </View>
          </Pressable>

          {/* ── Active Session Card ── */}
          {activeSession && (
            <Card style={styles.activeCard} elevated>
              <View style={styles.activeHeader}>
                <View style={styles.avatarsRow}>
                  <Avatar name={couple?.userA?.name || 'A'} size="sm" partnerRole="A" />
                  <Text style={styles.heartIcon}>❤️</Text>
                  <Avatar name={couple?.userB?.name || 'B'} size="sm" partnerRole="B" />
                </View>
                <Badge label="In Session" variant="active" />
              </View>
              <Text style={styles.activeTopic} numberOfLines={2}>
                {activeSession.topic || activeSession.context || 'Open conversation'}
              </Text>
              <Button
                title="Continue Session →"
                onPress={() => handleOpenSession(activeSession)}
                style={styles.continueBtn}
              />
            </Card>
          )}

          {/* ── Love Bank Card ── */}
          <View style={styles.loveBankCard}>
            <Text style={styles.loveBankLabel}>YOUR LOVE BANK</Text>
            <RNAnimated.Text style={[styles.loveBankQuote, { opacity: fadeAnim }]}>
              {LOVE_BANK_QUOTES[quoteIndex]}
            </RNAnimated.Text>
          </View>

          {/* ── Recent Sessions ── */}
          {pastSessions.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionLabel}>RECENT SESSIONS</Text>
                <Pressable onPress={() => navigation.navigate('SessionList')}>
                  <Text style={styles.seeAllLink}>See all</Text>
                </Pressable>
              </View>
              {pastSessions.map((item) => {
                const { userAComplete, userBComplete } = getCompletion(item);
                return (
                  <SessionCard
                    key={item.id}
                    session={item}
                    partnerAName={couple?.userA?.name || 'Partner A'}
                    partnerBName={couple?.userB?.name || 'Partner B'}
                    userAComplete={userAComplete}
                    userBComplete={userBComplete}
                    onPress={handleOpenSession}
                  />
                );
              })}
            </View>
          )}

          {/* ── Quick Actions ── */}
          <View style={styles.quickActionsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsRow}
            >
              <Pressable
                style={styles.quickPill}
                onPress={() => navigation.navigate('SessionList')}
              >
                <BookOpen color={colors.orangeMid} size={16} />
                <Text style={styles.quickPillText}>Our Learnings</Text>
              </Pressable>
              <Pressable style={styles.quickPill}>
                <MessageCircle color={colors.orangeMid} size={16} />
                <Text style={styles.quickPillText}>Send Partner Note</Text>
              </Pressable>
              <Pressable style={styles.quickPill}>
                <Zap color={colors.orangeMid} size={16} />
                <Text style={styles.quickPillText}>Check In</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* ── Empty State ── */}
          {!activeSession && pastSessions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyBody}>
                When something's on your mind, start a mediation and work through it together.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Hero ──
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helloText: {
    ...typography.displayMd,
    color: colors.textInverse,
    fontSize: 28,
    lineHeight: 34,
  },
  helloEmoji: {
    fontSize: 26,
  },
  settingsBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    marginBottom: spacing.md,
    gap: 8,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partnerInfo: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  togetherText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  heroFooter: {
    marginTop: spacing.sm,
  },
  heroStat: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Body ──
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.bgPrimary,
  },

  // Invite banner
  inviteBanner: {
    backgroundColor: colors.orangeTint,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.orangeLight + '40',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inviteBannerText: {
    fontFamily: fontFamilies.body,
    flex: 1,
    fontSize: 14,
    color: colors.orangeDeep,
  },

  // Main CTA card
  ctaCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  ctaLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ctaIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaEmoji: {
    fontSize: 28,
  },
  ctaTextWrap: {
    flex: 1,
  },
  ctaTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ctaSub: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  ctaArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // Active session
  activeCard: {
    marginBottom: spacing.md,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartIcon: {
    fontSize: 14,
  },
  activeTopic: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 14,
    lineHeight: 22,
  },
  continueBtn: {
    width: '100%',
  },

  // Love Bank card
  loveBankCard: {
    backgroundColor: colors.orangeTint,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.orangeMid,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  loveBankLabel: {
    ...typography.label,
    color: colors.orangeDeep,
    marginBottom: 10,
  },
  loveBankQuote: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 18,
    lineHeight: 26,
    color: colors.textPrimary,
  },

  // Recent sessions
  recentSection: {
    marginBottom: spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  seeAllLink: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    color: colors.orangeMid,
  },

  // Quick actions
  quickActionsSection: {
    marginBottom: spacing.lg,
  },
  quickActionsRow: {
    gap: 10,
    flexDirection: 'row',
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPillText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    color: colors.textPrimary,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    ...typography.displayMd,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
