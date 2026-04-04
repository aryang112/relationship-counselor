/**
 * ReconnectTabScreen — Landing page for the "Reconnect" bottom tab.
 *
 * Three states:
 *   1. Active reconnection session → Card with "Continue Reconnection" CTA
 *   2. No active but resolved sessions → "Past Reconnections" list
 *   3. No sessions at all → Empty state prompt
 *
 * Fetches sessions on mount via getSessions() and filters by status.
 *
 * Design: Warm light theme, bgPrimary background.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, MessageCircle, CheckCircle, ChevronRight, Clock } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography, fontFamilies } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { getSessions } from '../../services/sessions';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import type { Session } from '../../types/session';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

export function ReconnectTabScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const couple = useAuthStore((s) => s.couple);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [resolvedSessions, setResolvedSessions] = useState<Session[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      const sessions = await getSessions();
      setActiveSessions(sessions.filter((s) => s.status === 'reconnection'));
      setResolvedSessions(
        sessions
          .filter((s) => s.status === 'resolved')
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, [fetchSessions]);

  /** Get partner name from couple data */
  const partnerName = (() => {
    if (!couple) return 'your partner';
    const user = useAuthStore.getState().user;
    if (!user) return 'your partner';
    if (couple.userA?.id === user.id) return couple.userB?.name ?? 'your partner';
    return couple.userA?.name ?? 'your partner';
  })();

  /** Format date for display */
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /** Get display topic for a session */
  const getSessionTopic = (session: Session) =>
    session.topicTag || session.topic || session.context || 'Open conversation';

  // ── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.orangeMid} />
      </View>
    );
  }

  // ── Active Reconnection ────────────────────────────────────────────

  const activeSession = activeSessions[0];

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.orangeMid}
        />
      }
    >
      <Text style={styles.title} accessibilityRole="header">Reconnect</Text>

      {activeSession ? (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <View style={styles.activeIconWrap}>
              <MessageCircle size={24} color={colors.orangeMid} strokeWidth={1.8} />
            </View>
            <View style={styles.activeHeaderText}>
              <Text style={styles.activeTopicLabel}>In progress</Text>
              <Text style={styles.activeTopic} numberOfLines={2}>
                {getSessionTopic(activeSession)}
              </Text>
            </View>
          </View>

          <Text style={styles.activeStatus}>
            Your guided conversation with {partnerName} is in progress
          </Text>

          <Button
            title="Continue Reconnection"
            onPress={() =>
              navigation.navigate('Reconnection', { sessionId: activeSession.id })
            }
            size="lg"
            style={styles.continueButton}
          />
        </View>
      ) : null}

      {/* ── Past Reconnections ──────────────────────────────────────── */}

      {resolvedSessions.length > 0 ? (
        <View style={activeSession ? styles.pastSection : undefined}>
          <Text style={styles.sectionHeader}>Past Reconnections</Text>

          {resolvedSessions.map((session) => (
            <Pressable
              key={session.id}
              style={styles.pastCard}
              onPress={() => navigation.navigate('SessionDetail', { id: session.id })}
              accessibilityLabel={`View session: ${getSessionTopic(session)}`}
              accessibilityRole="button"
            >
              <View style={styles.pastCardLeft}>
                <View style={styles.pastIconWrap}>
                  <CheckCircle size={18} color={colors.success} strokeWidth={1.8} />
                </View>
                <View style={styles.pastCardContent}>
                  <Text style={styles.pastTopic} numberOfLines={1}>
                    {getSessionTopic(session)}
                  </Text>
                  <View style={styles.pastMeta}>
                    <Clock size={12} color={colors.textMuted} strokeWidth={1.5} />
                    <Text style={styles.pastDate}>{formatDate(session.updatedAt)}</Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* ── Empty State ─────────────────────────────────────────────── */}

      {!activeSession && resolvedSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Heart size={32} color={colors.orangeMid} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No active reconnection</Text>
          <Text style={styles.emptyDesc}>
            After you and your partner both complete your interviews, you'll meet
            here for a guided reconnection conversation.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    ...typography.displayMd,
    color: colors.textPrimary,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // ── Active Card ──────────────────────────────────────────────────
  activeCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activeHeaderText: {
    flex: 1,
  },
  activeTopicLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.orangeMid,
    fontWeight: '600',
    marginBottom: 2,
  },
  activeTopic: {
    fontFamily: fontFamilies.display,
    fontSize: 20,
    color: colors.textPrimary,
  },
  activeStatus: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  continueButton: {
    width: '100%',
  },

  // ── Past Reconnections ───────────────────────────────────────────
  pastSection: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    fontFamily: fontFamilies.display,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  pastCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pastCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  pastIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.safe,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pastCardContent: {
    flex: 1,
  },
  pastTopic: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  pastMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pastDate: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
  },

  // ── Empty State ──────────────────────────────────────────────────
  emptyState: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xl,
    ...shadows.card,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
