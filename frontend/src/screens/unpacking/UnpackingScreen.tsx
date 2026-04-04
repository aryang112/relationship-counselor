/**
 * UnpackingScreen -- "Phase 3: THE MAGIC MOMENT"
 *
 * Spotify Wrapped-style card reveal on dark background.
 * 7 swipeable reveal cards present AI analysis of both partners' interviews.
 *
 * Design: RelateApp_DesignSpec.md "AI Unpacking Screen"
 *   - Dark background (#1A0E08)
 *   - Horizontal snap scrolling through 7 themed cards
 *   - Progress dots at bottom (active = orangeLight, wider pill)
 *   - Staggered card entrance: FadeIn + scale 0.92 -> 1.0, 150ms stagger
 *   - [Begin Reconnection] button after final card
 *
 * Cards:
 *   1. THE SITUATION (warm white)
 *   2. [Your Name] felt... (orange gradient)
 *   3. [Partner] felt... (blue-gray gradient)
 *   4. WHAT YOU EACH NEEDED (split view)
 *   5. WHERE THE WIRES CROSSED (lavender/shared)
 *   6. WHAT YOU BOTH AGREE ON (warm cream)
 *   7. A PATH FORWARD (white)
 *
 * Preserves useUnpacking hook integration and all existing functionality.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  type ViewToken,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ArrowRight, Sparkles, MessageCircle } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { LoadingScreen } from '../../components/feedback/LoadingScreen';
import { LockStateView } from '../../components/domain/LockStateView';
import { FeedbackSheet } from '../../components/domain/FeedbackSheet';
import { useUnpacking } from '../../hooks/useUnpacking';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_MARGIN = 12;

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;
type UnpackingRoute = RouteProp<MainNavigatorParamList, 'Unpacking'>;

/**
 * Data structure for each reveal card in the unpacking sequence.
 */
interface RevealCard {
  key: string;
  type: 'situation' | 'partnerA' | 'partnerB' | 'needs' | 'wires' | 'agree' | 'forward';
  eyebrow: string;
  title: string;
  content: string;
  gradient?: readonly [string, string] | readonly [string, string, string];
  textColor: string;
  subtitleColor: string;
}

export function UnpackingScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<UnpackingRoute>();
  const addToast = useUIStore((s) => s.addToast);
  const couple = useAuthStore((s) => s.couple);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const {
    isLoading,
    isMutating,
    isRegenerating,
    state,
    unpacking,
    error,
    refresh,
    chooseView,
    unlockNow,
    sendFeedback,
  } = useUnpacking(route.params.sessionId);

  React.useEffect(() => {
    if (error) addToast(error, 'error');
  }, [addToast, error]);

  const secondaryMessage = useMemo(() => {
    if (!state?.locked || !state.autoUnlockAt) return undefined;
    const date = new Date(state.autoUnlockAt);
    return `Auto-unlocks on ${date.toLocaleString()}`;
  }, [state]);

  const partnerAName = couple?.userA?.name || 'Partner A';
  const partnerBName = couple?.userB?.name || 'Partner B';

  /** Build the 7 reveal cards from unpacking data. */
  const cards: RevealCard[] = useMemo(() => {
    if (!unpacking) return [];

    // Extract needs from deeper insight or pattern recognition
    const partnerANeeds = unpacking.partnerAExperience || '';
    const partnerBNeeds = unpacking.partnerBExperience || '';

    return [
      {
        key: 'situation',
        type: 'situation',
        eyebrow: 'THE SITUATION',
        title: 'Here\'s what happened.',
        content: unpacking.surfaceConflict || 'Processing your conversation...',
        textColor: colors.textPrimary,
        subtitleColor: colors.textSecondary,
      },
      {
        key: 'partnerA',
        type: 'partnerA',
        eyebrow: `${partnerAName.toUpperCase()} FELT...`,
        title: `${partnerAName} felt...`,
        content: unpacking.partnerAExperience || 'Generating insights...',
        gradient: [colors.orangeLight, colors.orangeDeep] as [string, string],
        textColor: colors.textInverse,
        subtitleColor: 'rgba(255,255,255,0.8)',
      },
      {
        key: 'partnerB',
        type: 'partnerB',
        eyebrow: `${partnerBName.toUpperCase()} FELT...`,
        title: `${partnerBName} felt...`,
        content: unpacking.partnerBExperience || 'Generating insights...',
        gradient: ['#A8C0D6', '#5A7A96'] as [string, string],
        textColor: colors.textInverse,
        subtitleColor: 'rgba(255,255,255,0.8)',
      },
      {
        key: 'needs',
        type: 'needs',
        eyebrow: 'BENEATH THE SURFACE',
        title: 'What you each needed',
        content: `${partnerAName}: ${partnerANeeds}\n\n${partnerBName}: ${partnerBNeeds}`,
        textColor: colors.textPrimary,
        subtitleColor: colors.textSecondary,
      },
      {
        key: 'wires',
        type: 'wires',
        eyebrow: 'THE BREAKTHROUGH',
        title: 'Where the wires crossed',
        content: unpacking.deeperInsight || 'Generating insights...',
        gradient: ['#C4A8D8', '#8B6AAA'] as [string, string],
        textColor: colors.textInverse,
        subtitleColor: 'rgba(255,255,255,0.8)',
      },
      {
        key: 'agree',
        type: 'agree',
        eyebrow: 'COMMON GROUND',
        title: 'What you both agree on',
        content: (unpacking.sharedTruths || []).map((t) => `\u2022 ${t}`).join('\n'),
        textColor: colors.textPrimary,
        subtitleColor: colors.textSecondary,
      },
      {
        key: 'forward',
        type: 'forward',
        eyebrow: 'A PATH FORWARD',
        title: 'Where to go from here',
        content: unpacking.patternRecognition || unpacking.deeperInsight || 'Generating insights...',
        textColor: colors.textPrimary,
        subtitleColor: colors.textSecondary,
      },
    ];
  }, [unpacking, partnerAName, partnerBName]);

  const isLastCard = activeIndex === cards.length - 1;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  /** Render a single reveal card. */
  const renderCard = useCallback(
    ({ item, index }: { item: RevealCard; index: number }) => {
      const isGradient = !!item.gradient;
      const delay = index * 150;

      const cardInner = (
        <Animated.View
          entering={FadeIn.delay(delay).duration(500)}
          style={[
            styles.revealCard,
            !isGradient && {
              backgroundColor:
                item.type === 'agree'
                  ? colors.orangeTint
                  : colors.bgElevated,
            },
          ]}
        >
          {/* Eyebrow label */}
          <Text
            style={[
              styles.cardEyebrow,
              { color: isGradient ? 'rgba(255,255,255,0.7)' : colors.orangeMid },
            ]}
          >
            {item.eyebrow}
          </Text>

          {/* Card title */}
          <Text style={[styles.cardTitle, { color: item.textColor }]}>
            {item.title}
          </Text>

          {/* Decorative icon for specific card types */}
          {item.type === 'agree' && (
            <View style={styles.heartAccent}>
              <Heart size={20} color={colors.orangeMid} fill={colors.orangeMid} />
            </View>
          )}
          {item.type === 'wires' && (
            <View style={styles.heartAccent}>
              <Sparkles size={20} color="rgba(255,255,255,0.7)" />
            </View>
          )}

          {/* Split view for "needs" card */}
          {item.type === 'needs' ? (
            <ScrollView style={styles.cardScrollArea} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <View style={styles.splitContainer}>
                <View style={[styles.splitHalf, { borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <View style={[styles.splitDot, { backgroundColor: colors.partnerA }]} />
                  <Text style={[styles.splitName, { color: colors.partnerA }]}>{partnerAName}</Text>
                  <Text style={[styles.cardContent, { color: item.textColor }]}>
                    {unpacking?.partnerAExperience || 'Generating insights...'}
                  </Text>
                </View>
                <View style={styles.splitHalf}>
                  <View style={[styles.splitDot, { backgroundColor: colors.partnerB }]} />
                  <Text style={[styles.splitName, { color: colors.partnerB }]}>{partnerBName}</Text>
                  <Text style={[styles.cardContent, { color: item.textColor }]}>
                    {unpacking?.partnerBExperience || 'Generating insights...'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={styles.cardScrollArea} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={[styles.cardContent, { color: item.subtitleColor }]}>
                {item.content}
              </Text>
            </ScrollView>
          )}

          {/* Synthesized attribution for situation card */}
          {item.type === 'situation' && (
            <View style={styles.attributionRow}>
              <MessageCircle size={12} color={colors.textMuted} />
              <Text style={styles.attributionText}>Synthesized from both of you</Text>
            </View>
          )}
        </Animated.View>
      );

      if (isGradient) {
        return (
          <View style={styles.cardWrapper}>
            <LinearGradient
              colors={item.gradient as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.revealCard}
            >
              {/* Eyebrow */}
              <Text
                style={[styles.cardEyebrow, { color: 'rgba(255,255,255,0.7)' }]}
              >
                {item.eyebrow}
              </Text>
              <Text style={[styles.cardTitle, { color: item.textColor }]}>
                {item.title}
              </Text>
              {item.type === 'wires' && (
                <View style={styles.heartAccent}>
                  <Sparkles size={20} color="rgba(255,255,255,0.7)" />
                </View>
              )}
              <ScrollView style={styles.cardScrollArea} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <Text style={[styles.cardContent, { color: item.subtitleColor }]}>
                  {item.content}
                </Text>
              </ScrollView>
            </LinearGradient>
          </View>
        );
      }

      return <View style={styles.cardWrapper}>{cardInner}</View>;
    },
    [partnerAName, partnerBName, unpacking],
  );

  if (isLoading) return <LoadingScreen message="Loading unpacking..." />;
  if (!state) return <LoadingScreen message="Preparing unpacking..." />;

  // Locked state -- show on light background
  if (state.locked) {
    return (
      <SafeArea>
        <View style={styles.lockedHeader}>
          <Text style={styles.lockedTitle} accessibilityRole="header">Your Unpacking</Text>
          <Text style={styles.lockedSub}>
            The AI read both sides. Results are almost ready.
          </Text>
          <View style={styles.avatarsRow}>
            <Avatar name={couple?.userA?.name || 'A'} size="sm" partnerRole="A" />
            <Text style={styles.plus}>+</Text>
            <Avatar name={couple?.userB?.name || 'B'} size="sm" partnerRole="B" />
          </View>
        </View>
        <View style={styles.lockContainer}>
          <LockStateView
            title={state.lockType === 'both_waiting' ? 'Unlock together' : 'Waiting for partner'}
            message={state.message}
            secondaryMessage={secondaryMessage}
            primaryActionLabel={state.canUnlock ? 'Unlock now' : undefined}
            onPrimaryAction={state.canUnlock ? unlockNow : undefined}
            secondaryActionLabel={!state.canUnlock ? 'View now instead' : undefined}
            onSecondaryAction={!state.canUnlock ? chooseView : undefined}
            loading={isMutating}
          />
        </View>
      </SafeArea>
    );
  }

  // Unlocked -- dark reveal experience
  return (
    <View style={styles.darkContainer}>
      <StatusBar barStyle="light-content" />

      {/* Header on dark bg */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.darkHeader}>
        <Text style={styles.eyebrow}>relate · unpacking</Text>
        <Text style={styles.heroTitle} accessibilityRole="header">Here's what{'\n'}we found.</Text>
        <View style={styles.avatarsRow}>
          <Avatar name={couple?.userA?.name || 'A'} size="sm" partnerRole="A" />
          <Text style={styles.plusWhite}>+</Text>
          <Avatar name={couple?.userB?.name || 'B'} size="sm" partnerRole="B" />
        </View>
      </Animated.View>

      {/* Status message if auto-unlocked */}
      {state.message ? (
        <Animated.View entering={FadeIn.delay(300).duration(400)}>
          <Text style={styles.statusNote}>{state.message}</Text>
        </Animated.View>
      ) : null}

      {/* Horizontal card carousel */}
      <FlatList
        ref={listRef}
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Progress dots */}
      <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.dotsRow}>
        {cards.map((card, i) => (
          <View
            key={card.key}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </Animated.View>

      {/* Bottom actions */}
      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.darkActions}>
        <Button
          title={isLastCard ? 'Begin Reconnection' : 'Continue'}
          onPress={() => {
            if (isLastCard) {
              navigation.navigate('Reconnection', { sessionId: route.params.sessionId });
            } else {
              listRef.current?.scrollToIndex({
                index: activeIndex + 1,
                animated: true,
              });
            }
          }}
          icon={<ArrowRight size={18} color={colors.textInverse} />}
          style={styles.primaryBtn}
        />
        <View style={styles.ghostRow}>
          <Pressable onPress={() => setFeedbackOpen(true)} accessibilityLabel="Give feedback on unpacking" accessibilityRole="button" style={styles.ghostBtn}>
            <Text style={styles.ghostText}>Give feedback</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Come back later" accessibilityRole="button" style={styles.ghostBtn}>
            <Text style={styles.ghostText}>Come back later</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Regenerating banner overlay */}
      {isRegenerating && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.regeneratingOverlay}
        >
          <ActivityIndicator size="small" color={colors.orangeLight} />
          <Text style={styles.regeneratingText}>
            Improving insights based on your feedback...
          </Text>
        </Animated.View>
      )}

      <FeedbackSheet
        visible={feedbackOpen}
        loading={isMutating}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={async (payload) => {
          await sendFeedback(payload);
          setFeedbackOpen(false);
          addToast('Regenerating insights...', 'info');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ---- Dark reveal container ----
  darkContainer: {
    flex: 1,
    backgroundColor: colors.darkBg,
    paddingTop: 60,
  },
  darkHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.orangeLight,
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.textInverse,
    marginBottom: 16,
  },
  statusNote: {
    fontFamily: fontFamilies.bodyBold,
    marginHorizontal: 24,
    marginBottom: 8,
    fontSize: 13,
    color: colors.success,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plus: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.textSecondary,
  },
  plusWhite: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },

  // ---- Carousel ----
  carouselContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
  },
  revealCard: {
    borderRadius: radius.xl,
    padding: 28,
    minHeight: SCREEN_HEIGHT * 0.38,
    justifyContent: 'flex-start',
    ...shadows.md,
  },
  cardEyebrow: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 16,
  },
  cardScrollArea: {
    flex: 1,
  },
  cardContent: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 26,
  },
  heartAccent: {
    marginBottom: 12,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attributionText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // ---- Split view (needs card) ----
  splitContainer: {
    flexDirection: 'row',
    gap: 0,
    flex: 1,
  },
  splitHalf: {
    flex: 1,
    paddingRight: 8,
    paddingLeft: 8,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  splitName: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // ---- Progress dots ----
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.orangeLight,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // ---- Dark bottom actions ----
  darkActions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  primaryBtn: {
    width: '100%',
  },
  ghostRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  ghostBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  ghostText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },

  // ---- Regenerating overlay ----
  regeneratingOverlay: {
    position: 'absolute',
    top: 140,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(26, 14, 8, 0.85)',
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  regeneratingText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  // ---- Locked state (light bg) ----
  lockedHeader: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
  },
  lockedTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  lockedSub: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  lockContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
