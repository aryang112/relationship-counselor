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

import React, { useState, useEffect, useCallback } from 'react';
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
import { getLearnings, type LearningResponse } from '../../services/couples';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

/**
 * Learning data model for local display.
 */
interface Learning {
  id: string;
  text: string;
  sessionDate: string;
  agreedByBoth: boolean;
}

export function LearningsHistoryScreen() {
  const navigation = useNavigation<Navigation>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);

  /** Fetch learnings from API on mount. */
  const fetchLearnings = useCallback(async () => {
    try {
      const data = await getLearnings();
      setLearnings(
        data.map((l) => ({
          id: l.id,
          text: l.text,
          sessionDate: l.sessionDate,
          agreedByBoth: l.userAAgreed && l.userBAgreed,
        })),
      );
    } catch (err) {
      console.warn('[Learnings] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLearnings();
  }, [fetchLearnings]);

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
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextBlock}>
            <BookOpen size={20} color={colors.orangeMid} />
            <Text style={styles.screenTitle} accessibilityRole="header">Shared Learnings</Text>
            <Text style={styles.screenSubtitle}>
              Everything you've learned together, in one place.
            </Text>
          </View>
        </View>

        {/* Loading state */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.orangeMid} />
            <Text style={styles.loadingText}>Loading learnings...</Text>
          </View>
        )}

        {/* Stats banner */}
        {!loading && learnings.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsBanner}>
            <Sparkles size={16} color={colors.orangeMid} />
            <Text style={styles.statsText}>
              {learnings.length} learnings saved \u00B7{' '}
              {learnings.filter((l) => l.agreedByBoth).length} agreed by both
            </Text>
          </Animated.View>
        )}

        {/* Learnings list */}
        {!loading && (
        <View style={styles.learningsList}>
          {learnings.map((learning, index) => {
            const isExpanded = expandedId === learning.id;
            return (
              <Animated.View
                key={learning.id}
                entering={FadeInDown.delay(150 + index * 100).duration(500)}
                layout={Layout.springify()}
              >
                <Card style={styles.learningCard} elevated>
                  <Pressable onPress={() => toggleExpand(learning.id)} accessibilityRole="button" accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} learning from ${formatDate(learning.sessionDate)}`}>
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

                  {/* Expanded: session date detail */}
                  {isExpanded && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.contextBlock}>
                      <View style={styles.contextDivider} />
                      <Text style={styles.contextLabel}>SESSION DATE</Text>
                      <Text style={styles.contextText}>
                        From your session on {formatDate(learning.sessionDate)}
                      </Text>
                    </Animated.View>
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </View>
        )}

        {/* Empty state */}
        {!loading && learnings.length === 0 && (
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

  // ---- Loading ----
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
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
