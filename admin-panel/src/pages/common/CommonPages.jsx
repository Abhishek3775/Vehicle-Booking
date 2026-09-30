import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';

export const NotFoundPage = () => {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div className="card" style={{ maxWidth: '440px', textAlign: 'center', padding: '3rem 2rem' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            marginBottom: '1rem',
          }}
        >
          <FiAlertCircle />
        </div>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          The requested administrative view or resource does not exist or has been relocated.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          <FiArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export const ComingSoonPage = ({ moduleName = 'Module', description = 'This module is currently part of the planned feature roadmap and will be released in an upcoming update.' }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title">
          <h1>{moduleName}</h1>
          <p className="page-header-subtitle">Planned / Future Feature</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '600px', margin: '2rem auto' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--purple-bg)',
            color: 'var(--purple-text)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Planned in Roadmap
        </div>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>
          {moduleName} Module Coming Soon
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {description}
        </p>
        <Link to="/dashboard" className="btn btn-secondary">
          <FiArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
};
