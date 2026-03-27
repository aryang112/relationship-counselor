/**
 * LearningsHistoryScreen -- List of all saved commitments/learnings
 *
 * Design: RelateApp_DesignSpec.md
 *   - bgPrimary background with Cormorant display header
 *   - List of all saved commitments/learnings with dates
 *   - Tap to expand full context
 *   - Each learning shown as a decorative card with italic serif text
 *
 * In production, learnings would be fetched from the API.
 * Placeholder data is used here for visual development.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import {
  BookOpen,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Card } from '../../components/ui/Card';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { formatDate } from '../../utils/format';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

/**
 * Learning data model.
 */
interface Learning {
  id: string;
  text: string;
  context: string;
  sessionDate: string;
  agreedByBoth: boolean;
}

/** Placeholder learning data -- would come from API in production. */
const MOCK_LEARNINGS: Learning[] = [
  {
    id: '1',
    text: 'When I feel unheard, I will name my need instead of withdrawing.',
    context: 'During your March 4th session, you both discovered that withdrawal was a pattern that made things worse. You agreed to try naming needs directly.',
    sessionDate: '2026-03-04T10:00:00Z',
    agreedByBoth: true,
  },
  {
    id: '2',
    text: 'Ask for a pause instead of shutting down.',
    context: 'Your partner shared that shutting down felt like abandonment. You learned that asking for a pause with a time commitment ("I need 20 minutes") provides safety.',
    sessionDate: '2026-02-28T14:00:00Z',
    agreedByBoth: true,
  },
  {
    id: '3',
    text: 'Start hard conversations with appreciation, not criticism.',
    context: 'The AI noticed a pattern: conversations that started with "You always..." went poorly. When either of you led with something you appreciate, the conversation went better.',
    sessionDate: '2026-02-15T11:00:00Z',
    agreedByBoth: true,
  },
  {
    id: '4',
    text: 'Check in before bed, even when tired.',
    context: 'Both of you mentioned that skipping the evening check-in often led to feeling disconnected the next day. A simple "How are you feeling?" before sleep helps.',
    sessionDate: '2026-02-01T20:00:00Z',
    agreedByBoth: false,
  },
];

export function LearningsHistoryScreen() {
  const navigation = useNavigation<Navigation>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeArea>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextBlock}>
            <BookOpen size={20} color={colors.orangeMid} />
            <Text style={styles.screenTitle}>Shared Learnings</Text>
            <Text style={styles.screenSubtitle}>
              Everything you've learned together, in one place.
            </Text>
          </View>
        </View>

        {/* Stats banner */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsBanner}>
          <Sparkles size={16} color={colors.orangeMid} />
          <Text style={styles.statsText}>
            {MOCK_LEARNINGS.length} learnings saved \u00B7{' '}
            {MOCK_LEARNINGS.filter((l) => l.agreedByBoth).length} agreed by both
          </Text>
        </Animated.View>

        {/* Learnings list */}
        <View style={styles.learningsList}>
          {MOCK_LEARNINGS.map((learning, index) => {
            const isExpanded = expandedId === learning.id;
            return (
              <Animated.View
                key={learning.id}
                entering={FadeInDown.delay(150 + index * 100).duration(500)}
                layout={Layout.springify()}
              >
                <Card style={styles.learningCard} elevated>
                  <Pressable onPress={() => toggleExpand(learning.id)}>
                    {/* Top row: date + expand indicator */}
                    <View style={styles.learningTopRow}>
                      <View style={styles.dateRow}>
                        <View
                          style={[
                            styles.dateDot,
                            {
                              backgroundColor: learning.agreedByBoth
                                ? colors.success
                                : colors.warning,
                            },
                          ]}
                        />
                        <Text style={styles.learningDate}>
                          {formatDate(learning.sessionDate)}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={18} color={colors.textMuted} />
                      ) : (
                        <ChevronDown size={18} color={colors.textMuted} />
                      )}
                    </View>

                    {/* Learning text -- italic serif */}
                    <Text style={styles.learningText}>{learning.text}</Text>

                    {/* Agreement badge */}
                    {learning.agreedByBoth && (
                      <View style={styles.agreedBadge}>
                        <Text style={styles.agreedBadgeText}>Both agreed</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Expanded context */}
                  {isExpanded && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.contextBlock}>
                      <View style={styles.contextDivider} />
                      <Text style={styles.contextLabel}>SESSION CONTEXT</Text>
                      <Text style={styles.contextText}>{learning.context}</Text>
                    </Animated.View>
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </View>

        {/* Empty state */}
        {MOCK_LEARNINGS.length === 0 && (
          <View style={styles.emptyState}>
            <BookOpen size={40} color={colors.orangeLight} />
            <Text style={styles.emptyTitle}>No learnings yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete a session to discover your first shared learning.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ---- Header ----
  header: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerTextBlock: {
    gap: 6,
  },
  screenTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    color: colors.textPrimary,
  },
  screenSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textSecondary,
  },

  // ---- Stats banner ----
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.orangeTint,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    color: colors.orangeDeep,
  },

  // ---- Learnings list ----
  learningsList: {
    gap: 14,
  },
  learningCard: {
    padding: 20,
  },
  learningTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  learningDate: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  learningText: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 18,
    lineHeight: 28,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  agreedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.safe,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  agreedBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.success,
  },

  // ---- Expanded context ----
  contextBlock: {
    marginTop: 16,
  },
  contextDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  contextLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
  },
  contextText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // ---- Empty state ----
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
