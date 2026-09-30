import React, { useState, useEffect } from 'react';
import {
  FiUser,
  FiShield,
  FiMail,
  FiPhone,
  FiCheckCircle,
  FiBriefcase,
  FiSave,
  FiKey
} from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingStates';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDateTime } from '../../utils/formatters';

const AdminProfilePage = () => {
  const { admin: authAdmin, updateAdminProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    profileImage: '',
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getProfile();
      const data = res.data || {};
      setProfile(data);
      setFormData({
        name: data.name || data.displayName || '',
        department: data.department || '',
        profileImage: data.profileImage || '',
      });
    } catch (err) {
      showError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await adminApi.updateProfile({
        name: formData.name,
        department: formData.department,
        profileImage: formData.profileImage,
      });

      const updated = res.data || { ...profile, ...formData };
      setProfile(updated);
      updateAdminProfile(updated);
      showSuccess('Admin profile updated successfully');
    } catch (err) {
      showError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner text="Loading admin credentials..." />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Admin Profile & Security
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Manage your administrative profile information and review assigned system permissions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Side: Profile Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 700,
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
            {profile?.name || 'Administrator'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {profile?.adminCode ? `Admin ID: ${profile.adminCode}` : 'Executive System Admin'}
          </div>

          <StatusBadge status={profile?.status || profile?.accountStatus || 'ACTIVE'} />

          <div style={{ width: '100%', borderTop: '1px solid var(--border)', marginTop: '1.5rem', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <FiPhone style={{ color: 'var(--primary)' }} />
              <span>{profile?.phone || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <FiMail style={{ color: 'var(--primary)' }} />
              <span>{profile?.email || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <FiBriefcase style={{ color: 'var(--primary)' }} />
              <span>Department: {profile?.department || 'Operations & Dispatch'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <FiShield style={{ color: 'var(--success)' }} />
              <span>Role: <strong>{profile?.role || 'ADMIN'}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Side: Edit Form & Permissions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              Edit Profile Details
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department / Unit</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Operations, Roadside Dispatch, Finance"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Image URL</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://..."
                  value={formData.profileImage}
                  onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <FiSave /> {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Assigned System Privileges */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              Assigned Permissions
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(profile?.permissions && profile.permissions.length > 0 ? profile.permissions : [
                'USERS_READ', 'USERS_MANAGE', 'MECHANICS_VERIFY', 'BOOKINGS_MANAGE', 'DISPATCH_OVERRIDE',
                'SERVICES_MANAGE', 'INVENTORY_MANAGE', 'PAYMENTS_AUDIT', 'INVOICES_MANAGE', 'SYSTEM_CONFIG'
              ]).map((perm) => (
                <span
                  key={perm}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.65rem',
                    background: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--primary)',
                    borderRadius: '4px',
                    border: '1px solid rgba(37, 99, 235, 0.2)',
                  }}
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminProfilePage;
