import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useThemeColors } from '../../theme';
import { createInvite, getMyCouple } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { successTap } from '../../utils/haptics';

interface InvitePartnerScreenProps {
  onPartnerJoined: () => void;
  onGoToAccept: () => void;
  onSkip: () => void;
}

export function InvitePartnerScreen({
  onPartnerJoined,
  onGoToAccept,
  onSkip,
}: InvitePartnerScreenProps) {
  const colors = useThemeColors();
  const addToast = useUIStore((s) => s.addToast);
  const setCouple = useAuthStore((s) => s.setCouple);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for partner joining
  useEffect(() => {
    if (!waiting) return;

    pollRef.current = setInterval(async () => {
      try {
        const couple = await getMyCouple();
        if (couple.userBId) {
          setCouple(couple);
          successTap();
          onPartnerJoined();
        }
      } catch {
        // ignore — keep polling
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [waiting, setCouple, onPartnerJoined]);

  const handleGenerateInvite = useCallback(async () => {
    setLoading(true);
    try {
      const res = await createInvite();
      setInviteToken(res.inviteToken);
      setCouple(res.couple);
      if (res.couple.userBId) {
        onPartnerJoined();
        return;
      }
      setWaiting(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not generate invite';
      addToast(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, onPartnerJoined, setCouple]);

  const handleShare = useCallback(async () => {
    if (!inviteToken) return;
    const inviteLink = `relationcounselor://invite/${inviteToken}`;
    try {
      await Share.share({
        message: `Join me on Relation Counselor so we can strengthen our relationship together. Use this invite code: ${inviteToken}\n\nOr tap: ${inviteLink}`,
      });
      successTap();
    } catch {
      // user cancelled share
    }
  }, [inviteToken]);

  return (
    <SafeArea>
      <Container style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Connect with your partner
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Both of you need to be on the app for sessions to work. Generate an
            invite or accept one from your partner.
          </Text>
        </View>

        {!inviteToken ? (
          <View>
            <Button
              title="Invite your partner"
              onPress={handleGenerateInvite}
              loading={loading}
              style={styles.actionBtn}
            />

            <Button
              title="I have an invite code"
              onPress={onGoToAccept}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        ) : (
          <View>
            <Card style={styles.tokenCard}>
              <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>
                Your invite code
              </Text>
              <Pressable onPress={handleShare}>
                <Text
                  style={[styles.tokenValue, { color: colors.primary }]}
                  selectable
                >
                  {inviteToken}
                </Text>
              </Pressable>
            </Card>

            <Button
              title="Share with partner"
              onPress={handleShare}
              style={styles.actionBtn}
            />

            {waiting && (
              <Card style={{ ...styles.waitingCard, backgroundColor: colors.surface2 }}>
                <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
                  Waiting for your partner to join...{'\n'}
                  We'll check every few seconds.
                </Text>
              </Card>
            )}
          </View>
        )}

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <Button
          title="Continue without partner for now"
          onPress={onSkip}
          variant="ghost"
        />
      </Container>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  actionBtn: {
    marginBottom: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  tokenCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  tokenValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  waitingCard: {
    marginTop: 16,
    alignItems: 'center',
    padding: 20,
  },
  waitingText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
