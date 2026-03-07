/**
 * InterviewScreen — Phase 1: Private Vent (Pi-style conversational interface).
 *
 * Design System: RelateApp_DesignSpec.md §4 "Private Vent Screen"
 *
 * Layout:
 *   - Full-screen, minimal, safe-feeling design on bgPrimary
 *   - Green safe badge: "Only you can see this" (safe + success colors)
 *   - Large Cormorant Garamond prompt text with italic emphasis
 *   - Chat history with AI and user bubbles
 *   - Emotion pills appearing after 2+ user responses
 *   - Bottom input bar: text area + voice button
 *
 * Preserves all existing useInterview hook integration and multi-turn chat flow.
 * Only the visual styling has been updated for the warm-light theme.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Lock, ArrowLeft, Mic } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ChatBubble } from '../../components/domain/ChatBubble';
import { TypingIndicator } from '../../components/domain/TypingIndicator';
import { VoiceRecorderButton } from '../../components/domain/VoiceRecorderButton';
import { LoadingScreen } from '../../components/feedback/LoadingScreen';
import { colors, typography, fontFamilies, spacing, radius, shadows } from '../../theme';
import { useInterview } from '../../hooks/useInterview';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { lightTap } from '../../utils/haptics';
import { formatTime } from '../../utils/format';

interface InterviewScreenProps {
  sessionId: string;
  onExit: () => void;
  onComplete: () => void;
}

const FEELINGS = ['Hurt', 'Dismissed', 'Scared', 'Angry', 'Confused', 'Other'];

export function InterviewScreen({
  sessionId,
  onExit,
  onComplete,
}: InterviewScreenProps) {
  const {
    messages,
    isLoading,
    isTranscribing,
    isComplete,
    sendTextResponse,
    sendVoiceResponse,
    exitAndSaveDraft,
  } = useInterview(sessionId);
  const { isRecording, startRecording, stopRecording, resetRecording } =
    useAudioRecorder();
  const [inputText, setInputText] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  React.useEffect(() => {
    if (isComplete) onComplete();
  }, [isComplete, onComplete]);

  const handleSendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    lightTap();
    await sendTextResponse(text);
  }, [inputText, sendTextResponse]);

  const handleStopRecording = useCallback(async () => {
    const uri = await stopRecording();
    if (uri) {
      resetRecording();
      await sendVoiceResponse(uri);
    }
    setShowVoice(false);
  }, [stopRecording, resetRecording, sendVoiceResponse]);

  const handleExit = useCallback(async () => {
    await exitAndSaveDraft();
    onExit();
  }, [exitAndSaveDraft, onExit]);

  const toggleFeeling = useCallback((feeling: string) => {
    setSelectedFeelings((prev) =>
      prev.includes(feeling)
        ? prev.filter((f) => f !== feeling)
        : prev.length < 3
          ? [...prev, feeling]
          : prev,
    );
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Preparing your safe space..." />;
  }

  // Show feelings after 2+ user messages
  const userMessages = messages.filter((m) => m.role === 'user');
  const showFeelingCheck = userMessages.length >= 2;

  return (
    <SafeArea edges={['top']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable onPress={handleExit} style={styles.backBtn}>
            <ArrowLeft color={colors.textSecondary} size={22} />
          </Pressable>
          <Text style={styles.stepIndicator}>Step 1 of 3</Text>
          <View style={styles.safeBadge}>
            <Lock color={colors.success} size={12} />
            <Text style={styles.safeBadgeText}>Only you can see this</Text>
          </View>
        </View>

        {/* ── Prompt header (shown when no messages yet) ── */}
        {messages.length <= 1 && (
          <View style={styles.promptSection}>
            <Text style={styles.promptTitle}>
              What happened?
            </Text>
            <Text style={styles.promptSub}>
              <Text style={styles.promptItalic}>Take your time.</Text>
              {'\n'}There's no wrong answer.
            </Text>
          </View>
        )}

        {/* ── Chat history ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => (
            <ChatBubble
              message={item.text}
              isUser={item.role === 'user'}
              role={item.role === 'user' ? 'user' : 'ai'}
              timestamp={item.timestamp ? formatTime(item.timestamp) : undefined}
            />
          )}
          ListFooterComponent={isTranscribing ? <TypingIndicator /> : null}
        />

        {/* ── Feeling pills ── */}
        {showFeelingCheck && (
          <View style={styles.feelingSection}>
            <Text style={styles.feelingLabel}>HOW DOES THIS MAKE YOU FEEL?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.feelingRow}
            >
              {FEELINGS.map((feeling) => {
                const selected = selectedFeelings.includes(feeling);
                return (
                  <Pressable
                    key={feeling}
                    onPress={() => toggleFeeling(feeling)}
                    style={[styles.feelingPill, selected && styles.feelingPillActive]}
                  >
                    <Text style={[styles.feelingText, selected && styles.feelingTextActive]}>
                      {feeling}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Input area ── */}
        {!isComplete && (
          <View style={styles.inputBar}>
            {showVoice ? (
              <View style={styles.voiceRow}>
                <VoiceRecorderButton
                  isRecording={isRecording}
                  onPressStart={startRecording}
                  onPressStop={handleStopRecording}
                  disabled={isTranscribing}
                />
                <Pressable onPress={() => setShowVoice(false)} style={styles.cancelVoice}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.textInputRow}>
                <View style={styles.textInputWrap}>
                  <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Start wherever feels right..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={2000}
                  />
                </View>
                {/* Voice button */}
                <Pressable
                  onPress={() => setShowVoice(true)}
                  style={styles.voiceBtn}
                >
                  <Mic color={colors.textInverse} size={20} />
                </Pressable>
                {/* Send button (shown when there is text) */}
                {inputText.trim().length > 0 && (
                  <Pressable
                    onPress={handleSendText}
                    style={styles.sendBtn}
                  >
                    <Text style={styles.sendText}>Send</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  stepIndicator: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.safe,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  safeBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },

  // ── Prompt section ──
  promptSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  promptTitle: {
    fontFamily: fontFamilies.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  promptSub: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.textSecondary,
  },
  promptItalic: {
    fontFamily: fontFamilies.displayItalic,
    color: colors.orangeMid,
  },

  // ── Chat list ──
  chatList: {
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },

  // ── Feeling pills ──
  feelingSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgPrimary,
  },
  feelingLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 10,
  },
  feelingRow: {
    gap: 8,
    flexDirection: 'row',
  },
  feelingPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feelingPillActive: {
    backgroundColor: colors.orangeTint,
    borderColor: colors.orangeMid,
  },
  feelingText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  feelingTextActive: {
    color: colors.orangeDeep,
    fontFamily: fontFamilies.bodyBold,
  },

  // ── Input bar ──
  inputBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  textInputWrap: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    maxHeight: 120,
  },
  textInput: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 24,
    maxHeight: 96,
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orangeMid,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.textInverse,
    fontWeight: '600',
  },
  voiceRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelVoice: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
