import React from 'react';
import { FiLoader } from 'react-icons/fi';

export const LoadingSpinner = ({ size = 20, color = 'var(--primary)', className = '' }) => (
  <FiLoader
    size={size}
    style={{ color }}
    className={`animate-spin ${className}`}
    aria-label="Loading"
  />
);

export const PageLoader = ({ message = 'Loading dashboard content...' }) => (
  <div className="state-container" style={{ minHeight: '320px' }}>
    <LoadingSpinner size={36} />
    <p style={{ marginTop: '0.75rem', fontWeight: 500 }}>{message}</p>
  </div>
);

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', className = '', style = {} }) => (
  <div
    className={`skeleton ${className}`}
    style={{ width, height, borderRadius, ...style }}
  />
);
