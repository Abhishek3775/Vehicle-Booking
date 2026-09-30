import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiCheckCircle, FiXCircle, FiStar, FiTruck } from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { DataTable } from '../../components/common/DataTable';
import { FilterBar } from '../../components/common/FilterBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { formatPhone } from '../../utils/formatters';

export const MechanicsListPage = () => {
  const { success, error: toastError } = useToast();

  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters State
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  // Verification Modal State
  const [verifyModal, setVerifyModal] = useState({
    isOpen: false,
    mechanic: null,
    newStatus: 'VERIFIED',
    reason: '',
    loading: false,
  });

  const fetchMechanics = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();
      if (verificationFilter) params.verificationStatus = verificationFilter;
      if (availabilityFilter) params.availabilityStatus = availabilityFilter;

      const res = await adminApi.getMechanics(params);
      if (res.success && res.data) {
        setMechanics(res.data);
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total || 0,
            totalPages: res.pagination.totalPages || 1,
          }));
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to fetch platform mechanics');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, verificationFilter, availabilityFilter, toastError]);

  useEffect(() => {
    fetchMechanics();
  }, [fetchMechanics]);

  const handleOpenVerifyModal = (mechanic, newStatus) => {
    setVerifyModal({
      isOpen: true,
      mechanic,
      newStatus,
      reason: '',
      loading: false,
    });
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyModal.reason.trim()) {
      toastError('Please provide a justification for this verification decision.');
      return;
    }

    setVerifyModal((prev) => ({ ...prev, loading: true }));
    try {
      await adminApi.updateMechanicVerification(verifyModal.mechanic.id || verifyModal.mechanic._id, {
        verificationStatus: verifyModal.newStatus,
        reason: verifyModal.reason.trim(),
      });
      success(`Mechanic verification status updated to '${verifyModal.newStatus}' successfully.`);
      setVerifyModal({ isOpen: false, mechanic: null, newStatus: 'VERIFIED', reason: '', loading: false });
      fetchMechanics();
    } catch (err) {
      toastError(err.message || 'Failed to update mechanic verification.');
      setVerifyModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    {
      header: 'Mechanic Profile',
      key: 'displayName',
      render: (row) => (
        <div>
          <Link to={`/mechanics/${row.id || row._id}`} style={{ fontWeight: 600 }}>
            {row.displayName}
          </Link>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Code: <code>{row.mechanicCode}</code>
          </div>
        </div>
      ),
    },
    {
      header: 'Phone',
      key: 'phone',
      render: (row) => formatPhone(row.phone),
    },
    {
      header: 'Specialization',
      key: 'specialization',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
          {row.specialization?.replace(/_/g, ' ') || 'General Service'}
        </span>
      ),
    },
    {
      header: 'Verification',
      key: 'verificationStatus',
      render: (row) => <StatusBadge status={row.verificationStatus || 'PENDING'} />,
    },
    {
      header: 'Availability',
      key: 'availabilityStatus',
      render: (row) => <StatusBadge status={row.availabilityStatus || 'OFFLINE'} />,
    },
    {
      header: 'Work Status',
      key: 'workStatus',
      render: (row) => <StatusBadge status={row.workStatus || 'IDLE'} />,
    },
    {
      header: 'Rating',
      key: 'ratingSummary',
      render: (row) => (
        <div className="flex items-center gap-1">
          <FiStar style={{ color: '#f59e0b', fill: '#f59e0b' }} size={13} />
          <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
            {row.ratingSummary?.averageRating ? row.ratingSummary.averageRating.toFixed(1) : '5.0'}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ({row.ratingSummary?.totalRatings || 0})
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Link
            to={`/mechanics/${row.id || row._id}`}
            className="btn btn-secondary btn-sm"
            title="View Details"
          >
            <FiEye size={14} /> View
          </Link>

          {row.verificationStatus !== 'VERIFIED' && (
            <button
              onClick={() => handleOpenVerifyModal(row, 'VERIFIED')}
              className="btn btn-success btn-sm"
              title="Verify Mechanic"
            >
              <FiCheckCircle size={14} /> Verify
            </button>
          )}

          {row.verificationStatus === 'PENDING' && (
            <button
              onClick={() => handleOpenVerifyModal(row, 'REJECTED')}
              className="btn btn-danger-outline btn-sm"
              title="Reject Verification"
            >
              <FiXCircle size={14} /> Reject
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-title">
          <h1>Mechanic Fleet Management</h1>
          <p className="page-header-subtitle">
            Monitor service professionals, verify credentials, track live availability, and manage operational readiness.
          </p>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPagination((p) => ({ ...p, page: 1 }));
        }}
        searchPlaceholder="Search by mechanic name or code..."
        filters={[
          {
            key: 'verificationStatus',
            label: 'All Verification States',
            value: verificationFilter,
            onChange: (val) => {
              setVerificationFilter(val);
              setPagination((p) => ({ ...p, page: 1 }));
            },
            options: [
              { label: 'Pending Verification', value: 'PENDING' },
              { label: 'Verified Mechanics', value: 'VERIFIED' },
              { label: 'Rejected Mechanics', value: 'REJECTED' },
              { label: 'Suspended Mechanics', value: 'SUSPENDED' },
            ],
          },
          {
            key: 'availabilityStatus',
            label: 'All Availability',
            value: availabilityFilter,
            onChange: (val) => {
              setAvailabilityFilter(val);
              setPagination((p) => ({ ...p, page: 1 }));
            },
            options: [
              { label: 'Available (Online)', value: 'AVAILABLE' },
              { label: 'Offline / Break', value: 'OFFLINE' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setVerificationFilter('');
          setAvailabilityFilter('');
          setPagination((p) => ({ ...p, page: 1 }));
        }}
      />

      <DataTable
        columns={columns}
        data={mechanics}
        loading={loading}
        emptyTitle="No mechanics found"
        emptyDescription="No service professionals matched your search filters."
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => setPagination((p) => ({ ...p, page: newPage })),
        }}
      />

      {/* Verification Decision Modal */}
      <Modal
        isOpen={verifyModal.isOpen}
        onClose={() => setVerifyModal({ isOpen: false, mechanic: null, newStatus: 'VERIFIED', reason: '', loading: false })}
        title={`Update Verification: ${verifyModal.mechanic?.displayName || 'Mechanic'}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setVerifyModal({ isOpen: false, mechanic: null, newStatus: 'VERIFIED', reason: '', loading: false })}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerifySubmit}
              disabled={verifyModal.loading}
              className={`btn ${verifyModal.newStatus === 'VERIFIED' ? 'btn-success' : 'btn-danger'}`}
            >
              {verifyModal.loading ? 'Processing...' : `Mark as ${verifyModal.newStatus}`}
            </button>
          </>
        }
      >
        <form onSubmit={handleVerifySubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Verification Decision</label>
            <select
              value={verifyModal.newStatus}
              onChange={(e) => setVerifyModal((prev) => ({ ...prev, newStatus: e.target.value }))}
            >
              <option value="VERIFIED">VERIFIED (Authorized for Service Dispatch)</option>
              <option value="REJECTED">REJECTED (Declined Application)</option>
              <option value="SUSPENDED">SUSPENDED (Temporary Operational Hold)</option>
              <option value="PENDING">PENDING (Awaiting Review)</option>
            </select>
          </div>

          <div>
            <label>Administrative Verification Notes (Required)</label>
            <textarea
              rows={3}
              placeholder="State clear operational reason for this verification status change..."
              value={verifyModal.reason}
              onChange={(e) => setVerifyModal((prev) => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MechanicsListPage;
