import React from 'react';
import { Skeleton } from './LoadingStates';

export const StatCard = ({
  icon: Icon,
  title,
  value,
  subtext = null,
  color = 'blue',
  loading = false,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`stat-card ${className}`}>
        <div className={`stat-card-icon ${color}`}>
          {Icon && <Icon />}
        </div>
        <div className="stat-card-content">
          <Skeleton width="60%" height="14px" style={{ marginBottom: '6px' }} />
          <Skeleton width="40%" height="24px" />
        </div>
      </div>
    );
  }

  return (
    <div className={`stat-card ${className}`}>
      <div className={`stat-card-icon ${color}`}>
        {Icon && <Icon />}
      </div>
      <div className="stat-card-content">
        <div className="stat-card-label">{title}</div>
        <div className="stat-card-value">{value ?? 0}</div>
        {subtext && <div className="stat-card-subtext">{subtext}</div>}
      </div>
    </div>
  );
};

export default StatCard;
