import React from 'react';
import { Link } from 'react-router-dom';
import { FiShieldOff, FiLogOut, FiHome } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export const UnauthorizedPage = () => {
  const { logout } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '1.5rem',
      }}
    >
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '3rem 2rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginBottom: '1.25rem',
          }}
        >
          <FiShieldOff />
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>403 - Access Forbidden</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          Your authenticated identity does not hold the <strong>ADMIN</strong> role required to access the Administrative Dashboard.
        </p>

        <div className="flex justify-between gap-3" style={{ justifyContent: 'center' }}>
          <button onClick={logout} className="btn btn-secondary">
            <FiLogOut size={16} /> Sign In as Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
