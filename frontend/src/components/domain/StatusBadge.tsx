import React from 'react';
import { Badge } from '../ui/Badge';
import type { SessionStatus } from '../../types/session';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

const STATUS_CONFIG: Record<SessionStatus, { label: string; variant: BadgeVariant }> = {
  initiated: { label: 'Started', variant: 'info' },
  in_progress: { label: 'In progress', variant: 'warning' },
  awaiting_partner_b: { label: 'Awaiting Partner', variant: 'warning' },
  unpacking_ready: { label: 'Unpacking ready', variant: 'success' },
  reconnection: { label: 'Reconnection', variant: 'info' },
  resolved: { label: 'Resolved', variant: 'success' },
  abandoned: { label: 'Abandoned', variant: 'error' },
};

interface StatusBadgeProps {
  status: SessionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.initiated;
  return <Badge label={config.label} variant={config.variant} />;
}
