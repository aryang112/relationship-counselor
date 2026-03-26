/**
 * SessionDetailScreen — Detailed view of a single mediation session.
 *
 * Design System: RelateApp_DesignSpec.md §4 "Session Detail"
 *
 * Layout:
 *   - Warm bgPrimary background with clean white elevated cards
 *   - Header with session topic and date
 *   - Summary card with status badge, context, and partner completion
 *   - Timeline with orange-tinted progress dots
 *   - Action buttons (Continue, Remind partner)
 *
 * Preserves all existing hook integrations (getSession, remindPartner).
 * Preserves navigation prop types and route params.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, Circle, Bell } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { PartnerStatus } from '../../components/domain/PartnerStatus';
import { Skeleton } from '../../components/feedback/Skeleton';
import { getSession, remindPartner } from '../../services/sessions';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';
import { formatDate } from '../../utils/format';
import { useUIStore } from '../../store/uiStore';
import type { Session, SessionStatus } from '../../types/session';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;
type SessionRoute = RouteProp<MainNavigatorParamList, 'SessionDetail'>;

const STATUSES: SessionStatus[] = [
  'initiated',
  'in_progress',
  'unpacking_ready',
  'reconnection',
  'resolved',
];

/** Human-readable labels for each status */
const STATUS_LABELS: Record<SessionStatus, string> = {
  initiated: 'Started',
  in_progress: 'Interviews',
  awaiting_partner_b: 'Awaiting Partner',
  unpacking_ready: 'Unpacking',
  reconnection: 'Reconnection',
  resolved: 'Resolved',
  abandoned: 'Abandoned',
};

export function SessionDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<SessionRoute>();
  const addToast = useUIStore((s) => s.addToast);
  const couple = useAuthStore((s) => s.couple);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadSession = useCallback(async () => {
    const data = await getSession(route.params.id);
    setSession(data);
  }, [route.params.id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getSession(route.params.id);
        if (mounted) {
          setSession(data);
        }
      } catch (err: any) {
        const message = err?.response?.data?.message;
        addToast(Array.isArray(message) ? message[0] : message || 'Unable to load session.', 'error');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [addToast, route.params.id]);

  const completion = useMemo(() => {
    if (!session) {
      return { userAComplete: false, userBComplete: false };
    }

    const interviews = session.interviews || [];
    return {
      userAComplete: Boolean(
        couple?.userAId && interviews.some((it) => it.userId === couple.userAId && !!it.completedAt),
      ),
      userBComplete: Boolean(
        couple?.userBId && interviews.some((it) => it.userId === couple.userBId && !!it.completedAt),
      ),
    };
  }, [couple?.userAId, couple?.userBId, session]);

  const statusIndex = session ? STATUSES.indexOf(session.status) : -1;

  const handleContinue = useCallback(() => {
    if (!session) return;

    if (session.status === 'initiated' || session.status === 'in_progress') {
      navigation.navigate('Interview', { sessionId: session.id });
      return;
    }

    if (session.status === 'unpacking_ready') {
      navigation.navigate('UnpackingChoice', { sessionId: session.id });
      return;
    }

    if (session.status === 'reconnection') {
      navigation.navigate('Reconnection', { sessionId: session.id });
      return;
    }

    if (session.status === 'resolved') {
      navigation.navigate('Commitments', { sessionId: session.id });
    }
  }, [navigation, session]);

  const handleRemind = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      const result = await remindPartner(session.id);
      addToast(result.message, 'success');
      await loadSession();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      addToast(Array.isArray(message) ? message[0] : message || 'Could not send reminder.', 'error');
    } finally {
      setBusy(false);
    }
  }, [addToast, loadSession, session]);

  if (loading || !session) {
    return (
      <SafeArea>
        <View style={styles.loadingContainer}>
          <Skeleton height={30} width="60%" />
          <Skeleton height={120} style={styles.skeleton} />
          <Skeleton height={120} style={styles.skeleton} />
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textSecondary} size={22} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {session.topic || 'Session Detail'}
            </Text>
            <Text style={styles.headerDate}>{formatDate(session.createdAt)}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary card */}
          <Card style={styles.summaryCard} elevated>
            <View style={styles.statusRow}>
              <Text style={styles.sectionTitle}>Current Status</Text>
              <StatusBadge status={session.status} />
            </View>
            <Text style={styles.context}>
              {session.context || 'No extra context provided.'}
            </Text>
            <View style={styles.divider} />
            <PartnerStatus
              userAName={couple?.userA?.name || 'Partner A'}
              userBName={couple?.userB?.name || 'Partner B'}
              userAComplete={completion.userAComplete}
              userBComplete={completion.userBComplete}
            />
          </Card>

          {/* Timeline card */}
          <Card style={styles.timelineCard} elevated>
            <Text style={styles.sectionTitle}>Journey</Text>
            <View style={styles.timeline}>
              {STATUSES.map((status, index) => {
                const reached = index <= statusIndex;
                const isCurrent = index === statusIndex;
                return (
                  <View key={status} style={styles.timelineItem}>
                    {/* Connector line (not for first item) */}
                    {index > 0 && (
                      <View
                        style={[
                          styles.timelineConnector,
                          {
                            backgroundColor: reached
                              ? colors.orangeMid
                              : colors.border,
                          },
                        ]}
                      />
                    )}
                    <View style={styles.timelineRow}>
                      {reached ? (
                        <CheckCircle
                          color={isCurrent ? colors.orangeMid : colors.orangeLight}
                          size={20}
                          fill={isCurrent ? colors.orangeTint : 'transparent'}
                        />
                      ) : (
                        <Circle color={colors.border} size={20} />
                      )}
                      <Text
                        style={[
                          styles.timelineLabel,
                          {
                            color: reached ? colors.textPrimary : colors.textMuted,
                            fontFamily: isCurrent ? fontFamilies.bodyBold : fontFamilies.body,
                          },
                        ]}
                      >
                        {STATUS_LABELS[status]}
                      </Text>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Button
              title="Continue"
              onPress={handleContinue}
              size="lg"
              style={styles.actionBtn}
            />
            <Button
              title="Remind partner"
              variant="secondary"
              loading={busy}
              onPress={handleRemind}
              icon={<Bell color={colors.orangeMid} size={16} />}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },

  // Loading state
  loadingContainer: {
    paddingTop: 20,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bgPrimary,
    flex: 1,
  },
  skeleton: {
    marginTop: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  headerDate: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Content
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    gap: 16,
  },

  // Summary card
  summaryCard: {
    gap: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  context: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // Timeline card
  timelineCard: {
    gap: 14,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    position: 'relative',
  },
  timelineConnector: {
    position: 'absolute',
    left: 9,
    top: -14,
    width: 2,
    height: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
  },
  timelineLabel: {
    fontSize: 14,
    textTransform: 'capitalize',
    flex: 1,
  },
  currentBadge: {
    backgroundColor: colors.orangeTint,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    color: colors.orangeDeep,
    fontWeight: '600',
  },

  // Actions
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    width: '100%',
  },
});
