import React from 'react';
import { formatStatusLabel } from '../../utils/formatters';

const STATUS_MAP = {
  // Success
  ACTIVE: 'success',
  VERIFIED: 'success',
  SUCCESS: 'success',
  COMPLETED: 'success',
  PAID: 'success',
  ACCEPTED: 'success',
  APPROVED: 'success',
  ISSUED: 'success',

  // Warning
  PENDING: 'warning',
  OFFERED: 'warning',
  QUOTE_PENDING: 'warning',
  INSPECTION: 'warning',
  BREAK: 'warning',
  PENDING_APPROVAL: 'warning',

  // Danger
  BLOCKED: 'danger',
  SUSPENDED: 'danger',
  REJECTED: 'danger',
  CANCELLED: 'danger',
  FAILED: 'danger',
  DEACTIVATED: 'danger',
  EXPIRED: 'danger',
  DISCONTINUED: 'danger',

  // Info
  ASSIGNED: 'info',
  EN_ROUTE: 'info',
  ON_THE_WAY: 'info',
  ARRIVED: 'info',
  ON_JOB: 'info',
  IN_PROGRESS: 'info',
  QUOTE_APPROVED: 'info',
  DRAFT: 'info',
  AVAILABLE: 'info',

  // Purple
  EMERGENCY_ROADSIDE: 'purple',
  SCHEDULED: 'info',
  DOORSTEP_SERVICE: 'purple',

  // Neutral
  OFFLINE: 'neutral',
  IDLE: 'neutral',
  INACTIVE: 'neutral',
  CLOSED: 'neutral',
};

export const StatusBadge = ({ status, label = null, className = '' }) => {
  if (!status) return <span>—</span>;

  const type = STATUS_MAP[status.toString().toUpperCase()] || 'neutral';
  const displayLabel = label || formatStatusLabel(status);

  return (
    <span className={`badge badge-${type} ${className}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
