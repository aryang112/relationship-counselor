/**
 * DeleteAccountScreen — Account deletion flow with confirmation.
 *
 * Shows a warning card explaining what gets deleted, an optional reason
 * TextInput, and a destructive "Delete My Account" button with native
 * Alert confirmation.
 *
 * On successful deletion: clears SecureStore, resets auth state, navigates
 * back to onboarding.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
  InputAccessoryView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { KeyboardDoneBar, KEYBOARD_DONE_ID } from '../../components/ui/KeyboardDoneBar';
import { useAuthStore } from '../../store/authStore';
import { deleteAccount } from '../../services/auth';
import { clearAuthToken, clearStoredUser } from '../../services/api';
import { colors, fontFamilies, spacing, radius, shadows } from '../../theme';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

const DELETE_ITEMS = [
  'Your profile and account information',
  'All mediation session history',
  'Partner connection and couple data',
  'AI processing consent records',
  'All onboarding and preference data',
];

export function DeleteAccountScreen() {
  const navigation = useNavigation<Navigation>();
  const user = useAuthStore((s) => s.user);
  const reset = useAuthStore((s) => s.reset);
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone);

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Account?',
      'This action cannot be undone. All your data will be permanently deleted within 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ],
    );
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await deleteAccount(reason.trim() || undefined);

      // Clear all local state
      await clearAuthToken();
      await clearStoredUser();
      if (user?.id) {
        await SecureStore.deleteItemAsync(`onboarding_done_${user.id}`);
        await SecureStore.deleteItemAsync(`ai_consent_${user.id}`);
      }
      await SecureStore.deleteItemAsync('onboarding_done');

      // Reset auth store — this triggers RootNavigator to show onboarding
      setOnboardingDone(false);
      reset();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      Alert.alert(
        'Error',
        typeof msg === 'string' ? msg : 'Failed to delete account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeArea>
      <KeyboardDoneBar />
      <Header
        title="Delete Account"
        left={
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.orangeMid} strokeWidth={2} />
          </Pressable>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning card */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={22} color={colors.error} />
            <Text style={styles.warningTitle}>This is permanent</Text>
          </View>
          <Text style={styles.warningBody}>
            Deleting your account will permanently remove the following data
            within 30 days:
          </Text>
          {DELETE_ITEMS.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Optional reason */}
        <Text style={styles.reasonLabel}>
          Why are you leaving? (optional)
        </Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="Help us improve..."
          placeholderTextColor={colors.textMuted}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          maxLength={500}
          textAlignVertical="top"
          inputAccessoryViewID={KEYBOARD_DONE_ID}
        />

        {/* Delete button */}
        <Button
          title={loading ? '' : 'Delete My Account'}
          variant="danger"
          onPress={handleDelete}
          disabled={loading}
          icon={loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
          style={styles.deleteBtn}
        />

        {/* Cancel */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },

  // Warning card
  warningCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  warningTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 17,
    fontWeight: '600',
    color: colors.error,
  },
  warningBody: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: spacing.xs,
    marginBottom: 4,
  },
  bullet: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  // Reason input
  reasonLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reasonInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    minHeight: 80,
    marginBottom: spacing.xl,
  },

  // Buttons
  deleteBtn: {
    marginBottom: spacing.md,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  cancelText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textMuted,
  },
});
