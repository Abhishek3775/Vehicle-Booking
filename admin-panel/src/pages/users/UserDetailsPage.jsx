import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiUser,
  FiPhone,
  FiMail,
  FiTruck,
  FiCalendar,
  FiShield,
  FiCheckCircle,
} from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingStates';
import { ErrorState } from '../../components/common/FeedbackStates';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatPhone } from '../../utils/formatters';

export const UserDetailsPage = () => {
  const { userId } = useParams();
  const { success, error: toastError } = useToast();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUserById(userId);
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve user details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleToggleStatus = async (newStatus) => {
    const reason = window.prompt(`Please provide a reason to change status to ${newStatus}:`, 'Administrative review');
    if (!reason) return;

    try {
      await adminApi.updateUserStatus(userId, { status: newStatus, reason });
      success(`User account status updated to ${newStatus}`);
      fetchUserDetails();
    } catch (err) {
      toastError(err.message || 'Failed to update user status');
    }
  };

  if (loading) return <PageLoader message="Fetching customer profile & vehicle records..." />;
  if (error || !user) return <ErrorState title="User Not Found" message={error} onRetry={fetchUserDetails} />;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <Link to="/users" className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }}>
            <FiArrowLeft size={14} /> Back
          </Link>
          <div>
            <h1>{user.name || 'Customer Profile'}</h1>
            <p className="page-header-subtitle">User Reference ID: {user.userId}</p>
          </div>
        </div>

        <div className="page-header-actions">
          {user.accountStatus === 'ACTIVE' ? (
            <button
              onClick={() => handleToggleStatus('BLOCKED')}
              className="btn btn-danger-outline btn-sm"
            >
              Block Customer Account
            </button>
          ) : (
            <button
              onClick={() => handleToggleStatus('ACTIVE')}
              className="btn btn-success btn-sm"
            >
              Activate Customer Account
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Profile Overview</div>
            <StatusBadge status={user.accountStatus} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                }}
              >
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Role: {user.role}</div>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />

            <div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                <FiPhone size={14} /> Mobile Phone
              </div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{formatPhone(user.phone)}</div>
            </div>

            <div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                <FiMail size={14} /> Email Address
              </div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{user.email || '—'}</div>
            </div>

            <div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                <FiCalendar size={14} /> Total Lifetime Bookings
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                {user.bookingsCount || 0}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                <FiClock size={14} /> Registered On
              </div>
              <div style={{ fontWeight: 500, fontSize: '0.8125rem', marginTop: '0.2rem' }}>
                {formatDateTime(user.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Registered Vehicles Garage */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Registered Customer Vehicles ({user.vehiclesCount || 0})</div>
          </div>

          {!user.vehicles || user.vehicles.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No vehicles registered in this customer's garage yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {user.vehicles.map((v) => (
                <div
                  key={v.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {v.make} {v.model}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                      }}
                    >
                      {v.vehicleType}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Variant: {v.variant || 'Standard'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Fuel: {v.fuelType || '—'}
                  </div>

                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.35rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      display: 'inline-block',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {v.registrationNumber}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsPage;
