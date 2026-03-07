import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from './StatusBadge';
import { PartnerStatus } from './PartnerStatus';
import { useThemeColors } from '../../theme';
import { timeAgo } from '../../utils/format';
import type { Session } from '../../types/session';

interface SessionCardProps {
  session: Session;
  partnerAName: string;
  partnerBName: string;
  userAComplete: boolean;
  userBComplete: boolean;
  onPress: (session: Session) => void;
}

export function SessionCard({
  session,
  partnerAName,
  partnerBName,
  userAComplete,
  userBComplete,
  onPress,
}: SessionCardProps) {
  const colors = useThemeColors();

  return (
    <Card style={styles.card} elevated>
      <View style={styles.headerRow}>
        <Text style={[styles.topic, { color: colors.textPrimary }]} numberOfLines={1}>
          {session.topic || 'Untitled session'}
        </Text>
        <StatusBadge status={session.status} />
      </View>

      <Text style={[styles.meta, { color: colors.textMuted }]}>Started {timeAgo(session.createdAt)}</Text>

      <PartnerStatus
        userAName={partnerAName}
        userBName={partnerBName}
        userAComplete={userAComplete}
        userBComplete={userBComplete}
      />

      <Button
        title="Open session"
        size="sm"
        variant="secondary"
        onPress={() => onPress(session)}
        style={styles.button}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topic: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
