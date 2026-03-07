import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { useThemeColors } from '../../theme';
import { signAgreement } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { successTap } from '../../utils/haptics';

interface AgreementScreenProps {
  onComplete: () => void;
}

const AGREEMENT_POINTS = [
  'I will approach this process with honesty and openness.',
  "I will listen to my partner's perspective with empathy.",
  'I understand my individual responses remain private.',
  'I commit to engaging in the reconnection process in good faith.',
  'I will not use information shared here to cause harm.',
];

export function AgreementScreen({ onComplete }: AgreementScreenProps) {
  const colors = useThemeColors();
  const couple = useAuthStore((s) => s.couple);
  const user = useAuthStore((s) => s.user);
  const setCouple = useAuthStore((s) => s.setCouple);
  const addToast = useUIStore((s) => s.addToast);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const partnerA = couple?.userA;
  const partnerB = couple?.userB;
  const userSigned =
    (user?.id === couple?.userAId && !!couple?.userASignedAt) ||
    (user?.id === couple?.userBId && !!couple?.userBSignedAt);

  const handleSign = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await signAgreement({ confirm: true });
      setCouple(updated);
      successTap();
      if (updated.userASignedAt && updated.userBSignedAt) {
        onComplete();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not sign agreement';
      addToast(Array.isArray(msg) ? msg[0] : msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [setCouple, addToast, onComplete]);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Container>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Mutual agreement
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Both partners need to agree to these principles before starting
          </Text>

          <Card style={styles.agreementCard}>
            {AGREEMENT_POINTS.map((point, i) => (
              <View key={i} style={styles.pointRow}>
                <Text style={[styles.bullet, { color: colors.primary }]}>
                  {'\u2022'}
                </Text>
                <Text style={[styles.pointText, { color: colors.textPrimary }]}>
                  {point}
                </Text>
              </View>
            ))}
          </Card>

          <View style={styles.signatureRow}>
            {partnerA && (
              <View style={styles.signatureCol}>
                <Avatar name={partnerA.name} size="md" />
                <Text style={[styles.sigName, { color: colors.textPrimary }]}>
                  {partnerA.name}
                </Text>
                <Text
                  style={[
                    styles.sigStatus,
                    {
                      color: couple?.userASignedAt
                        ? colors.success
                        : colors.textMuted,
                    },
                  ]}
                >
                  {couple?.userASignedAt ? 'Signed' : 'Pending'}
                </Text>
              </View>
            )}
            {partnerB && (
              <View style={styles.signatureCol}>
                <Avatar name={partnerB.name} size="md" />
                <Text style={[styles.sigName, { color: colors.textPrimary }]}>
                  {partnerB.name}
                </Text>
                <Text
                  style={[
                    styles.sigStatus,
                    {
                      color: couple?.userBSignedAt
                        ? colors.success
                        : colors.textMuted,
                    },
                  ]}
                >
                  {couple?.userBSignedAt ? 'Signed' : 'Pending'}
                </Text>
              </View>
            )}
          </View>

          {!userSigned && (
            <>
              <Pressable
                style={styles.checkRow}
                onPress={() => setAgreed(!agreed)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: agreed ? colors.primary : colors.border,
                      backgroundColor: agreed ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {agreed && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </View>
                <Text style={[styles.checkLabel, { color: colors.textPrimary }]}>
                  I agree to all of the above
                </Text>
              </Pressable>

              <Button
                title="Sign agreement"
                onPress={handleSign}
                disabled={!agreed}
                loading={loading}
                style={styles.signBtn}
              />
            </>
          )}

          {userSigned && (
            <Card style={{ ...styles.waitCard, backgroundColor: colors.surface2 }}>
              <Text style={[styles.waitText, { color: colors.textSecondary }]}>
                You've signed! Waiting for your partner to sign too.
              </Text>
            </Card>
          )}
        </Container>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  agreementCard: {
    marginBottom: 24,
  },
  pointRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 18,
    marginRight: 10,
    marginTop: -1,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  signatureCol: {
    alignItems: 'center',
  },
  sigName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  sigStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 15,
  },
  signBtn: {
    marginBottom: 16,
  },
  waitCard: {
    alignItems: 'center',
    padding: 20,
  },
  waitText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
