import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiNavigation,
  FiUserCheck,
  FiRepeat,
  FiXCircle,
  FiRefreshCw,
  FiClock,
  FiAlertTriangle,
  FiCheck
} from 'react-icons/fi';
import { dispatchApi } from '../../services/dispatch.api';
import { adminApi } from '../../services/admin.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import Modal from '../../components/common/Modal';
import { formatDateTime } from '../../utils/formatters';
import { DISPATCH_STATUS } from '../../utils/constants';

const DispatchListPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [reassignModal, setReassignModal] = useState({ isOpen: false, dispatch: null, mechanicId: '', reason: '' });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, dispatch: null, reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Available mechanics for manual assignment / reassignment
  const [mechanicsList, setMechanicsList] = useState([]);

  const fetchDispatches = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (statusFilter) params.status = statusFilter;

      const res = await dispatchApi.getDispatchList(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) || 1 };

      setDispatches(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 10,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load dispatch records');
      showError(err.message || 'Failed to load dispatch records');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.limit, showError]);

  useEffect(() => {
    fetchDispatches(1);
  }, [fetchDispatches]);

  // Load verified available mechanics when modal opens
  const loadMechanics = async () => {
    try {
      const res = await adminApi.getMechanics({ limit: 100, verificationStatus: 'VERIFIED' });
      setMechanicsList(res.data || []);
    } catch (err) {
      console.error('Could not load mechanics list', err);
    }
  };

  const handleOpenReassign = (dispatch) => {
    setReassignModal({ isOpen: true, dispatch, mechanicId: '', reason: '' });
    loadMechanics();
  };

  const handleExecuteReassign = async () => {
    if (!reassignModal.mechanicId) {
      showError('Please select a replacement mechanic');
      return;
    }

    try {
      setActionLoading(true);
      await dispatchApi.reassignDispatch(reassignModal.dispatch._id, {
        mechanicId: reassignModal.mechanicId,
        reason: reassignModal.reason || 'Admin reallocated dispatch',
      });
      showSuccess('Dispatch reassigned successfully');
      setReassignModal({ isOpen: false, dispatch: null, mechanicId: '', reason: '' });
      fetchDispatches(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to reassign dispatch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteCancel = async () => {
    try {
      setActionLoading(true);
      await dispatchApi.cancelDispatch(cancelModal.dispatch._id, {
        reason: cancelModal.reason || 'Admin cancelled dispatch',
      });
      showSuccess('Dispatch cancelled successfully');
      setCancelModal({ isOpen: false, dispatch: null, reason: '' });
      fetchDispatches(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to cancel dispatch');
    } finally {
      setActionLoading(false);
    }
  };

  const statusOptions = Object.values(DISPATCH_STATUS).map((s) => ({
    label: s.replace(/_/g, ' '),
    value: s,
  }));

  const columns = [
    {
      header: 'Booking Ref',
      accessor: 'booking',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
            {row.booking?.bookingReference || (typeof row.booking === 'string' ? row.booking.slice(-8).toUpperCase() : 'N/A')}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Type: {row.dispatchType || 'BROADCAST'}
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Mechanic',
      accessor: 'mechanic',
      render: (row) => (
        <div>
          {row.mechanic ? (
            <div>
              <div style={{ fontWeight: 600 }}>{row.mechanic.name || 'Mechanic'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {row.mechanic.phone}
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Pending Acceptance
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Dispatch Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Attempts / Radius',
      accessor: 'retryCount',
      render: (row) => (
        <div style={{ fontSize: '0.85rem' }}>
          <div>Retries: <strong>{row.retryCount ?? 0}</strong></div>
          {row.searchRadiusKm && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Radius: {row.searchRadiusKm} km
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Offered / Expiry',
      accessor: 'offeredAt',
      render: (row) => (
        <div style={{ fontSize: '0.8rem' }}>
          {row.offeredAt && <div>Offered: {formatDateTime(row.offeredAt)}</div>}
          {row.expiresAt && (
            <div style={{ color: 'var(--danger)', fontWeight: 500 }}>
              Expires: {formatDateTime(row.expiresAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="table-actions">
          {['SEARCHING', 'OFFERED', 'PENDING', 'ACCEPTED'].includes(row.status) && (
            <>
              <button
                className="action-btn"
                title="Reassign to Another Mechanic"
                onClick={() => handleOpenReassign(row)}
              >
                <FiRepeat />
              </button>
              <button
                className="action-btn delete"
                title="Cancel Dispatch"
                onClick={() => setCancelModal({ isOpen: true, dispatch: row, reason: '' })}
              >
                <FiXCircle />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Dispatch Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Monitor real-time roadside broadcast offers, mechanic acceptances, and manual assignments.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchDispatches(pagination.page)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh Board
        </button>
      </div>

      <FilterBar
        searchPlaceholder=""
        selectFilters={[
          {
            name: 'status',
            value: statusFilter,
            placeholder: 'All Dispatch Statuses',
            options: statusOptions,
            onChange: setStatusFilter,
          },
        ]}
        onClearFilters={() => {
          setStatusFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={dispatches}
        loading={loading}
        error={error}
        onRetry={() => fetchDispatches(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchDispatches(page)}
        emptyMessage="No active dispatch operations found."
      />

      {/* Reassign Mechanic Modal */}
      {reassignModal.isOpen && (
        <Modal
          isOpen={reassignModal.isOpen}
          title="Reassign Dispatch to Mechanic"
          onClose={() => setReassignModal({ isOpen: false, dispatch: null, mechanicId: '', reason: '' })}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Select a verified mechanic to reassign this service dispatch.
            </p>
            <div className="form-group">
              <label className="form-label">Select Mechanic</label>
              <select
                className="form-control"
                value={reassignModal.mechanicId}
                onChange={(e) => setReassignModal({ ...reassignModal, mechanicId: e.target.value })}
              >
                <option value="">-- Choose Available Mechanic --</option>
                {mechanicsList.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.mechanicCode || 'N/A'}) - {m.workStatus || 'AVAILABLE'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reassignment Reason</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Reason for changing assigned mechanic..."
                value={reassignModal.reason}
                onChange={(e) => setReassignModal({ ...reassignModal, reason: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setReassignModal({ isOpen: false, dispatch: null, mechanicId: '', reason: '' })}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExecuteReassign}
                disabled={actionLoading}
              >
                {actionLoading ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Dispatch Modal */}
      {cancelModal.isOpen && (
        <ConfirmModal
          isOpen={cancelModal.isOpen}
          title="Cancel Dispatch"
          confirmText="Cancel Dispatch"
          confirmVariant="danger"
          loading={actionLoading}
          onConfirm={handleExecuteCancel}
          onCancel={() => setCancelModal({ isOpen: false, dispatch: null, reason: '' })}
        >
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to cancel this active dispatch broadcast?
          </p>
          <div className="form-group">
            <label className="form-label">Cancellation Reason</label>
            <input
              type="text"
              className="form-control"
              placeholder="Reason for cancellation..."
              value={cancelModal.reason}
              onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default DispatchListPage;
