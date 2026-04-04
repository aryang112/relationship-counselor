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
 *   - Bottom input bar: text area + voice button
 *
 * Preserves all existing useInterview hook integration and multi-turn chat flow.
 * Only the visual styling has been updated for the warm-light theme.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Lock, ArrowLeft, Mic } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { ChatBubble } from '../../components/domain/ChatBubble';
import { TypingIndicator } from '../../components/domain/TypingIndicator';
import { VoiceRecorderButton } from '../../components/domain/VoiceRecorderButton';
import { LoadingScreen } from '../../components/feedback/LoadingScreen';
import { CrisisResourcesModal } from '../../components/domain/CrisisResourcesModal';
import { colors, fontFamilies, spacing, radius, shadows } from '../../theme';
import { useInterview } from '../../hooks/useInterview';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAuthStore } from '../../store/authStore';
import { getGenderCopy } from '../../utils/genderCopy';
import { lightTap } from '../../utils/haptics';
import { formatTime } from '../../utils/format';

interface InterviewScreenProps {
  sessionId: string;
  partnerBOpeningMessage?: string;
  readOnly?: boolean;
  onExit: () => void;
  onComplete: () => void;
}

export function InterviewScreen({
  sessionId,
  partnerBOpeningMessage,
  readOnly,
  onExit,
  onComplete,
}: InterviewScreenProps) {
  const user = useAuthStore((s) => s.user);
  const copy = getGenderCopy(user?.gender, user?.name);
  const {
    messages,
    isLoading,
    isTranscribing,
    isThinking,
    isComplete,
    crisisDetected,
    sendTextResponse,
    sendVoiceResponse,
    exitAndSaveDraft,
  } = useInterview(sessionId, partnerBOpeningMessage, user?.gender, user?.name);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const { isRecording, startRecording, stopRecording, resetRecording } =
    useAudioRecorder();
  const [inputText, setInputText] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // ── Safe badge entry animation ──
  const safeBadgeOpacity = useSharedValue(0);
  const lockRotation = useSharedValue(-10);

  useEffect(() => {
    safeBadgeOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    lockRotation.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 100 }));
  }, []);

  const safeBadgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: safeBadgeOpacity.value,
    transform: [{ rotate: `${lockRotation.value}deg` }],
  }));

  // ── Send button fade animation ──
  const sendOpacity = useSharedValue(0);

  useEffect(() => {
    sendOpacity.value = withTiming(inputText.trim().length > 0 ? 1 : 0, { duration: 200 });
  }, [inputText]);

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sendOpacity.value,
  }));

  // ── Scroll to end when keyboard opens ──
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    return () => showSub.remove();
  }, []);

  React.useEffect(() => {
    if (readOnly || !isComplete) return;
    if (crisisDetected) {
      setShowCrisisModal(true);
    } else {
      onComplete();
    }
  }, [isComplete, crisisDetected, onComplete, readOnly]);

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

  if (isLoading) {
    return <LoadingScreen message={copy.loadingMessage} />;
  }

  return (
    <SafeArea edges={['top']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable onPress={handleExit} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <ArrowLeft color={colors.textSecondary} size={22} />
          </Pressable>
          <Text style={styles.stepIndicator} accessibilityRole="header">{readOnly ? 'Chat History' : 'Step 1 of 3'}</Text>
          <Animated.View style={[styles.safeBadge, safeBadgeAnimatedStyle]}>
            <Lock color={colors.success} size={12} />
            <Text style={styles.safeBadgeText}>Only you can see this</Text>
          </Animated.View>
        </View>

        {/* ── Prompt header (shown when no messages yet) ── */}
        {messages.length <= 1 && (
          <Animated.View
            style={styles.promptSection}
            entering={FadeInDown.duration(600).delay(400)}
          >
            <Text style={styles.promptTitle}>
              {copy.promptTitle}
            </Text>
            <Text style={styles.promptSub}>
              <Text style={styles.promptItalic}>{copy.promptItalic}</Text>
              {'\n'}{copy.promptSub}
            </Text>
          </Animated.View>
        )}

        {/* ── Chat history ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.chatList, { flexGrow: 1, justifyContent: 'flex-end' }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item, index }) => (
            <ChatBubble
              message={item.text}
              isUser={item.role === 'user'}
              role={item.role === 'user' ? 'user' : 'ai'}
              timestamp={item.timestamp ? formatTime(item.timestamp) : undefined}
              index={index}
            />
          )}
          ListFooterComponent={isTranscribing || isThinking ? <TypingIndicator /> : null}
        />

        {/* ── Input area ── */}
        {!isComplete && !readOnly && (
          <View style={styles.inputBar}>
            {showVoice ? (
              <View style={styles.voiceRow}>
                <VoiceRecorderButton
                  isRecording={isRecording}
                  onPressStart={startRecording}
                  onPressStop={handleStopRecording}
                  disabled={isTranscribing}
                />
                <Pressable onPress={() => setShowVoice(false)} style={styles.cancelVoice} accessibilityLabel="Cancel voice recording" accessibilityRole="button">
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
                    placeholder={copy.inputPlaceholder}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={2000}
                    editable={!isThinking}
                    blurOnSubmit
                    onSubmitEditing={() => {
                      if (inputText.trim()) handleSendText();
                    }}
                    returnKeyType="send"
                  />
                </View>
                {/* Voice button */}
                <Pressable
                  onPress={() => setShowVoice(true)}
                  style={styles.voiceBtn}
                  accessibilityLabel="Record voice message"
                  accessibilityRole="button"
                >
                  <Mic color={colors.textInverse} size={20} />
                </Pressable>
                {/* Send button (fades in/out based on input text) */}
                <Animated.View
                  style={sendAnimatedStyle}
                  pointerEvents={inputText.trim().length > 0 ? 'auto' : 'none'}
                >
                  <Pressable
                    onPress={handleSendText}
                    style={styles.sendBtn}
                    accessibilityLabel="Send message"
                    accessibilityRole="button"
                  >
                    <Text style={styles.sendText}>Send</Text>
                  </Pressable>
                </Animated.View>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Crisis resources modal — auto-opens when crisis detected after interview submit */}
      <CrisisResourcesModal
        visible={showCrisisModal}
        onClose={() => {
          setShowCrisisModal(false);
          onComplete();
        }}
      />
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

  // ── Input bar ──
  inputBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    paddingBottom: 20,
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
