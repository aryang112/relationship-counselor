/**
 * SessionListScreen — All sessions view with pull-to-refresh.
 *
 * Design System: RelateApp_DesignSpec.md §4 "Session List"
 *
 * Layout:
 *   - Warm bgPrimary background
 *   - Header with Cormorant Garamond title
 *   - FlatList of SessionCard components
 *   - Pull-to-refresh
 *   - Empty state with illustration and CTA
 *
 * Preserves all existing hook integrations (useSessionList, useAuthStore).
 * Preserves navigation prop types.
 */

import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { EmptyState } from '../../components/feedback/EmptyState';
import { SessionCard } from '../../components/domain/SessionCard';
import { useSessionList } from '../../hooks/useSession';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, fontFamilies, spacing, radius } from '../../theme';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';
import type { Session } from '../../types/session';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

export function SessionListScreen() {
  const navigation = useNavigation<Navigation>();
  const { sessions, refresh } = useSessionList();
  const couple = useAuthStore((s) => s.couple);

  const getCompletion = useCallback(
    (session: Session) => {
      const interviews = session.interviews || [];
      const userAId = couple?.userAId;
      const userBId = couple?.userBId;

      return {
        userAComplete: Boolean(
          userAId && interviews.some((it) => it.userId === userAId && !!it.completedAt),
        ),
        userBComplete: Boolean(
          userBId && interviews.some((it) => it.userId === userBId && !!it.completedAt),
        ),
      };
    },
    [couple?.userAId, couple?.userBId],
  );

  return (
    <SafeArea>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textSecondary} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>All Sessions</Text>
          <View style={styles.headerRight}>
            <Text style={styles.sessionCount}>
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
            </Text>
          </View>
        </View>

        {/* Session list */}
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const completion = getCompletion(item);
            return (
              <SessionCard
                session={item}
                partnerAName={couple?.userA?.name || 'Partner A'}
                partnerBName={couple?.userB?.name || 'Partner B'}
                userAComplete={completion.userAComplete}
                userBComplete={completion.userBComplete}
                onPress={(session) => navigation.navigate('SessionDetail', { id: session.id })}
              />
            );
          }}
          refreshing={false}
          onRefresh={refresh}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <EmptyState
                title="No sessions yet"
                message="Start your first mediation to begin your journey of understanding together."
              />
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
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
  headerTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  sessionCount: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
});
