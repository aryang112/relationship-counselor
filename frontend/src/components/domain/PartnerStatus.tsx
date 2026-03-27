import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { useThemeColors } from '../../theme';

interface PartnerStatusProps {
  userAName: string;
  userBName: string;
  userAComplete: boolean;
  userBComplete: boolean;
}

function PartnerChip({
  name,
  completed,
}: {
  name: string;
  completed: boolean;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.chip}>
      <Avatar name={name} size="sm" />
      <View style={styles.meta}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: completed ? colors.success : colors.textMuted,
              },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {completed ? 'Complete' : 'Waiting'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PartnerStatus({
  userAName,
  userBName,
  userAComplete,
  userBComplete,
}: PartnerStatusProps) {
  return (
    <View style={styles.row}>
      <PartnerChip name={userAName} completed={userAComplete} />
      <PartnerChip name={userBName} completed={userBComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
  },
});
