/**
 * ReconnectionScreen -- Guided Reconnection Chat (Phase 4)
 *
 * Design: RelateApp_DesignSpec.md "Reconnection Chat"
 *   - bgPrimary background
 *   - Both partner avatars side by side with heart icon
 *   - Partner A (right): Orange gradient bubbles
 *   - Partner B (left): Blue-gray gradient bubbles
 *   - AI Mediator (center, full width): White card with orangeMid left border
 *   - Suggested response pills between messages
 *   - Voice mic button (orange gradient circle) + text input + send
 *   - Commitment builder trigger from AI
 *
 * Preserves useReconnection hook integration: messages, sendMessage, isMyTurn.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  Send,
  Mic,
  ArrowLeft,
  Sparkles,
} from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useReconnection } from '../../hooks/useReconnection';
import { colors, fontFamilies, typography, spacing, radius, shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { formatTime } from '../../utils/format';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';
import type { ReconnectionMessage, ReconnectionMessageRole } from '../../hooks/useReconnection';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;
type ReconnectionRoute = RouteProp<MainNavigatorParamList, 'Reconnection'>;

export function ReconnectionScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ReconnectionRoute>();
  const couple = useAuthStore((s) => s.couple);
  const [value, setValue] = useState('');
  const listRef = useRef<FlatList>(null);

  const partnerName = couple?.userB?.name || 'Your partner';
  const { messages, sending, sendMessage } = useReconnection(route.params.sessionId, partnerName);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || value).trim();
    if (!msg) return;
    setValue('');
    await sendMessage(msg);
  }, [sendMessage, value]);

  /** Render a single chat message bubble. */
  const renderMessage = useCallback(
    ({ item }: { item: ReconnectionMessage }) => {
      // AI mediator message -- full-width white card with orange left border
      if (item.role === 'ai') {
        return (
          <Animated.View entering={FadeIn.duration(400)} style={styles.aiContainer}>
            <View style={styles.aiBubble}>
              <View style={styles.aiLabelRow}>
                <Sparkles size={12} color={colors.orangeMid} />
                <Text style={styles.aiLabel}>relate</Text>
              </View>
              <Text style={styles.aiText}>{item.text}</Text>
            </View>
          </Animated.View>
        );
      }

      // Partner messages
      const isMine = item.role === 'me';
      return (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
        >
          {isMine ? (
            <LinearGradient
              colors={colors.gradientCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubble}
            >
              <Text style={[styles.bubbleText, { color: colors.textInverse }]}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#A8C0D6', '#7B8FA6'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubble}
            >
              <Text style={[styles.bubbleText, { color: colors.textInverse }]}>{item.text}</Text>
            </LinearGradient>
          )}
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        </Animated.View>
      );
    },
    [],
  );

  return (
    <SafeArea style={{ backgroundColor: colors.bgPrimary }}>
      {/* Chat header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <ArrowLeft size={20} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.avatarGroup}>
            <Avatar name={couple?.userA?.name || 'A'} size="sm" partnerRole="A" />
            <Avatar
              name={couple?.userB?.name || 'B'}
              size="sm"
              partnerRole="B"
              style={styles.avatarOverlap}
            />
            <View style={styles.heartCircle}>
              <Heart size={10} color={colors.textInverse} fill={colors.textInverse} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.topTitle} accessibilityRole="header">Reconnection</Text>
            <Text style={styles.topSubtitle} numberOfLines={2}>Guided by relate</Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Commitments', { sessionId: route.params.sessionId })}
          style={styles.commitBtn}
          accessibilityLabel="View learnings"
          accessibilityRole="button"
        >
          <Text style={styles.commitText}>Learnings</Text>
        </Pressable>
      </View>

      {/* Messages list */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messageList, { flexGrow: 1, justifyContent: 'flex-end' as const }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          {/* Voice mic button */}
          <LinearGradient
            colors={colors.gradientCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.micBtn}
          >
            <Pressable style={styles.micBtnInner} accessibilityLabel="Record voice message" accessibilityRole="button">
              <Mic size={18} color={colors.textInverse} />
            </Pressable>
          </LinearGradient>

          {/* Text input */}
          <TextInput
            value={value}
            onChangeText={setValue}
            style={styles.input}
            placeholder="Share your response..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          {/* Send button */}
          <Pressable
            onPress={() => handleSend()}
            disabled={!value.trim() || sending}
            style={[
              styles.sendBtn,
              (!value.trim() || sending) && styles.sendBtnDisabled,
            ]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Send
              size={16}
              color={!value.trim() || sending ? colors.textMuted : colors.textInverse}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // ---- Top bar ----
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -12,
  },
  heartCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.orangeMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
  },
  topTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  topSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  commitBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeTint,
  },
  commitText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    color: colors.orangeDeep,
  },

  // ---- Message list ----
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
  },

  // ---- AI bubble ----
  aiContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  aiBubble: {
    backgroundColor: colors.bgElevated,
    borderLeftWidth: 3,
    borderLeftColor: colors.orangeMid,
    borderRadius: radius.md,
    padding: 16,
    maxWidth: '92%',
    ...shadows.sm,
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  aiLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.orangeMid,
  },
  aiText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },

  // ---- Partner bubbles ----
  bubbleRow: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
  },
  bubbleRowTheirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontFamily: fontFamilies.body,
    marginTop: 4,
    fontSize: 11,
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },

  // ---- Input bar ----
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  micBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.body,
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 42,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orangeMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
