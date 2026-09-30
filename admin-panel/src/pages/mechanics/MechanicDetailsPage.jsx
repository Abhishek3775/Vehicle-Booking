import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiPhone,
  FiStar,
  FiCheckCircle,
  FiMapPin,
  FiTool,
  FiAward,
  FiLayers,
} from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingStates';
import { ErrorState } from '../../components/common/FeedbackStates';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatPhone } from '../../utils/formatters';

export const MechanicDetailsPage = () => {
  const { mechanicId } = useParams();
  const { success, error: toastError } = useToast();

  const [mechanic, setMechanic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMechanicDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getMechanicById(mechanicId);
      if (res.success && res.data) {
        setMechanic(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve mechanic details');
    } finally {
      setLoading(false);
    }
  }, [mechanicId]);

  useEffect(() => {
    fetchMechanicDetails();
  }, [fetchMechanicDetails]);

  const handleUpdateVerification = async (newStatus) => {
    const reason = window.prompt(`Provide reason for setting verification status to ${newStatus}:`, 'Administrative verification');
    if (!reason) return;

    try {
      await adminApi.updateMechanicVerification(mechanicId, { verificationStatus: newStatus, reason });
      success(`Mechanic verification status updated to ${newStatus}`);
      fetchMechanicDetails();
    } catch (err) {
      toastError(err.message || 'Failed to update verification status');
    }
  };

  if (loading) return <PageLoader message="Fetching mechanic profile & operational credentials..." />;
  if (error || !mechanic) return <ErrorState title="Mechanic Not Found" message={error} onRetry={fetchMechanicDetails} />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title">
          <Link to="/mechanics" className="btn btn-secondary btn-sm" style={{ marginRight: '0.5rem' }}>
            <FiArrowLeft size={14} /> Back
          </Link>
          <div>
            <h1>{mechanic.displayName}</h1>
            <p className="page-header-subtitle">
              Mechanic Code: <code>{mechanic.mechanicCode}</code>
            </p>
          </div>
        </div>

        <div className="page-header-actions">
          {mechanic.verificationStatus !== 'VERIFIED' ? (
            <button
              onClick={() => handleUpdateVerification('VERIFIED')}
              className="btn btn-success btn-sm"
            >
              <FiCheckCircle size={14} /> Approve Verification
            </button>
          ) : (
            <button
              onClick={() => handleUpdateVerification('SUSPENDED')}
              className="btn btn-danger-outline btn-sm"
            >
              Suspend Authorization
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Professional Profile</div>
            <StatusBadge status={mechanic.verificationStatus} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                }}
              >
                {mechanic.displayName ? mechanic.displayName.charAt(0).toUpperCase() : 'M'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{mechanic.displayName}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Experience: {mechanic.experienceYears || 0} Years
                </div>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Phone Contact</div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{formatPhone(mechanic.phone)}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Primary Specialization</div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                {mechanic.specialization?.replace(/_/g, ' ') || 'General Servicing'}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Current State</div>
              <div className="flex gap-2" style={{ marginTop: '0.35rem' }}>
                <StatusBadge status={mechanic.availabilityStatus} />
                <StatusBadge status={mechanic.workStatus} />
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Service Radius</div>
              <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{mechanic.serviceRadius || 15} km</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Customer Rating</div>
              <div className="flex items-center gap-1" style={{ marginTop: '0.2rem' }}>
                <FiStar style={{ color: '#f59e0b', fill: '#f59e0b' }} size={16} />
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {mechanic.ratingSummary?.averageRating ? mechanic.ratingSummary.averageRating.toFixed(1) : '5.0'}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  ({mechanic.ratingSummary?.totalRatings || 0} reviews)
                </span>
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Completed Jobs</div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--success)', marginTop: '0.2rem' }}>
                {mechanic.completedJobs || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities & Live Location Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Supported Vehicles & Skills */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Vehicle Compatibility & Skills</div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Supported Vehicle Types:
              </div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {mechanic.supportedVehicleTypes?.map((vt) => (
                  <span
                    key={vt}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                    }}
                  >
                    {vt.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Skills & Certifications:
              </div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {mechanic.skills && mechanic.skills.length > 0 ? (
                  mechanic.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#f1f5f9',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>General Automotive Skills</span>
                )}
              </div>
            </div>
          </div>

          {/* GPS Coordinates Telemetry */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Live GPS Telemetry</div>
            </div>

            {mechanic.currentLocation && mechanic.currentLocation.latitude ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latitude</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{mechanic.currentLocation.latitude}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Longitude</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{mechanic.currentLocation.longitude}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Ping</div>
                  <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                    {formatDateTime(mechanic.currentLocation.updatedAt)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem' }}>
                No active GPS coordinates broadcasted yet by this mechanic.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MechanicDetailsPage;
