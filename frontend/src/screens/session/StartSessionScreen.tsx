/**
 * StartSessionScreen — Quick session start screen (tab bar entry point).
 *
 * Design System: RelateApp_DesignSpec.md §4
 *
 * This is a simpler alternative to StartMediationScreen, accessible from
 * the tab bar or direct navigation. It provides a text input to describe
 * the situation and creates a session.
 *
 * Layout:
 *   - Warm bgPrimary background
 *   - Cormorant Garamond title
 *   - Text input area
 *   - Send button
 *
 * Preserves existing createSession integration and navigation flow.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { KeyboardDoneBar, KEYBOARD_DONE_ID } from '../../components/ui/KeyboardDoneBar';
import { createSession } from '../../services/sessions';
import { colors, fontFamilies, spacing, radius, shadows } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

export function StartSessionScreen() {
  const navigation = useNavigation<Navigation>();
  const addToast = useUIStore((s) => s.addToast);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = text.trim().length > 0 && !loading;

  const onCreate = useCallback(async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      const session = await createSession({
        context: text.trim(),
      });
      navigation.replace('SessionDetail', { id: session.id });
    } catch (err: any) {
      const message = err?.response?.data?.message;
      addToast(
        Array.isArray(message) ? message[0] : message || 'Could not start session.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [canSubmit, text, addToast, navigation]);

  return (
    <SafeArea>
      <KeyboardDoneBar />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.textSecondary} size={22} />
          </Pressable>
        </View>

        {/* Center content */}
        <View style={styles.center}>
          <Text style={styles.title}>What's going on?</Text>
          <Text style={styles.hint}>
            Describe what happened or what's been on your mind. Be as open as you'd like.
          </Text>
        </View>

        {/* Input area at bottom */}
        <View style={styles.inputArea}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="We had a disagreement about..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
              autoFocus
              textAlignVertical="top"
              inputAccessoryViewID={KEYBOARD_DONE_ID}
            />
          </View>
          <Pressable
            onPress={onCreate}
            disabled={!canSubmit}
            style={[
              styles.sendBtn,
              {
                backgroundColor: canSubmit ? colors.orangeMid : colors.bgSecondary,
              },
            ]}
          >
            {loading ? (
              <Text style={styles.sendIcon}>...</Text>
            ) : (
              <Text
                style={[
                  styles.sendIcon,
                  { color: canSubmit ? colors.textInverse : colors.textMuted },
                ]}
              >
                {'↑'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  backBtn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  hint: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    paddingBottom: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWrap: {
    flex: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 140,
    minHeight: 44,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    minHeight: 24,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
