import React from 'react';
import { FiInbox, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export const EmptyState = ({
  icon: Icon = FiInbox,
  title = 'No records found',
  description = 'There are no items matching your current filters or query.',
  action = null,
}) => (
  <div className="state-container">
    <div className="state-icon">
      <Icon />
    </div>
    <div className="state-title">{title}</div>
    <div className="state-description">{description}</div>
    {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
  </div>
);

export const ErrorState = ({
  title = 'Failed to load content',
  message = 'An unexpected network error occurred. Please try again.',
  onRetry = null,
}) => (
  <div className="state-container">
    <div className="state-icon" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-bg)' }}>
      <FiAlertTriangle />
    </div>
    <div className="state-title">{title}</div>
    <div className="state-description">{message}</div>
    {onRetry && (
      <button onClick={onRetry} className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
        <FiRefreshCw size={14} /> Retry Request
      </button>
    )}
  </div>
);
