import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { KeyboardAware } from '../../components/layout/KeyboardAware';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useThemeColors } from '../../theme';
import { acceptInvite } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { successTap } from '../../utils/haptics';

interface AcceptInviteScreenProps {
  prefillToken?: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function AcceptInviteScreen({
  prefillToken,
  onSuccess,
  onBack,
}: AcceptInviteScreenProps) {
  const colors = useThemeColors();
  const setCouple = useAuthStore((s) => s.setCouple);
  const addToast = useUIStore((s) => s.addToast);
  const [token, setToken] = useState(prefillToken || '');
  const [loading, setLoading] = useState(false);

  const handleAccept = useCallback(async () => {
    if (!token.trim()) return;
    setLoading(true);
    try {
      const couple = await acceptInvite({ inviteToken: token.trim() });
      setCouple(couple);
      successTap();
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid or expired invite';
      addToast(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, setCouple, addToast, onSuccess]);

  return (
    <SafeArea>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <KeyboardAware style={styles.content}>
            <Container>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Join your partner
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Paste the invite code your partner shared with you
              </Text>

              <Input
                label="Invite code"
                placeholder="Paste invite code here"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <Button
                title="Accept invite"
                onPress={handleAccept}
                loading={loading}
                disabled={!token.trim()}
                style={styles.acceptBtn}
              />
              <Button title="Go back" onPress={onBack} variant="ghost" />
            </Container>
          </KeyboardAware>
        </View>
      </TouchableWithoutFeedback>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 32,
  },
  acceptBtn: {
    marginBottom: 12,
  },
});
