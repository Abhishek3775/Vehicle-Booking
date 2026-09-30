import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiUserCheck, FiUserX, FiShield } from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { DataTable } from '../../components/common/DataTable';
import { FilterBar } from '../../components/common/FilterBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';

export const UsersListPage = () => {
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Status Change Modal State
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    user: null,
    newStatus: 'ACTIVE',
    reason: '',
    loading: false,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await adminApi.getUsers(params);
      if (res.success && res.data) {
        setUsers(res.data);
        if (res.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: res.pagination.total || 0,
            totalPages: res.pagination.totalPages || 1,
          }));
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to fetch platform users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, toastError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenStatusModal = (user, newStatus) => {
    setStatusModal({
      isOpen: true,
      user,
      newStatus,
      reason: '',
      loading: false,
    });
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModal.reason.trim()) {
      toastError('Please provide an administrative reason for updating user status.');
      return;
    }

    setStatusModal((prev) => ({ ...prev, loading: true }));
    try {
      await adminApi.updateUserStatus(statusModal.user.userId || statusModal.user.id, {
        status: statusModal.newStatus,
        reason: statusModal.reason.trim(),
      });
      success(`User status updated to '${statusModal.newStatus}' successfully.`);
      setStatusModal({ isOpen: false, user: null, newStatus: 'ACTIVE', reason: '', loading: false });
      fetchUsers();
    } catch (err) {
      toastError(err.message || 'Failed to update user status.');
      setStatusModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const columns = [
    {
      header: 'Customer Name',
      key: 'name',
      render: (row) => (
        <div>
          <Link to={`/users/${row.userId || row.id}`} style={{ fontWeight: 600 }}>
            {row.name || 'Unnamed User'}
          </Link>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {row.userId || row.id}</div>
        </div>
      ),
    },
    {
      header: 'Email Address',
      key: 'email',
      render: (row) => row.email || <span style={{ color: 'var(--text-muted)' }}>Unregistered</span>,
    },
    {
      header: 'Account Status',
      key: 'accountStatus',
      render: (row) => <StatusBadge status={row.accountStatus || 'ACTIVE'} />,
    },
    {
      header: 'Registered Date',
      key: 'createdAt',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Link
            to={`/users/${row.userId || row.id}`}
            className="btn btn-secondary btn-sm"
            title="View Details"
          >
            <FiEye size={14} /> Details
          </Link>

          {row.accountStatus === 'ACTIVE' ? (
            <button
              onClick={() => handleOpenStatusModal(row, 'BLOCKED')}
              className="btn btn-danger-outline btn-sm"
              title="Block User"
            >
              <FiUserX size={14} /> Block
            </button>
          ) : (
            <button
              onClick={() => handleOpenStatusModal(row, 'ACTIVE')}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--success)', borderColor: 'var(--success-border)' }}
              title="Activate User"
            >
              <FiUserCheck size={14} /> Activate
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
          <h1>Customer User Management</h1>
          <p className="page-header-subtitle">
            Search, filter, inspect customer vehicle fleets, and moderate user account access.
          </p>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPagination((p) => ({ ...p, page: 1 }));
        }}
        searchPlaceholder="Search by customer name or email..."
        filters={[
          {
            key: 'status',
            label: 'All Statuses',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPagination((p) => ({ ...p, page: 1 }));
            },
            options: [
              { label: 'Active Accounts', value: 'ACTIVE' },
              { label: 'Blocked Accounts', value: 'BLOCKED' },
              { label: 'Suspended Accounts', value: 'SUSPENDED' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
          setPagination((p) => ({ ...p, page: 1 }));
        }}
      />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyTitle="No platform customers found"
        emptyDescription="No users matched your query or filter parameters."
        pagination={{
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: pagination.totalPages,
          onPageChange: (newPage) => setPagination((p) => ({ ...p, page: newPage })),
        }}
      />

      {/* User Moderation Status Modal */}
      <Modal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ isOpen: false, user: null, newStatus: 'ACTIVE', reason: '', loading: false })}
        title={`Moderate User Status: ${statusModal.user?.name || 'Customer'}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setStatusModal({ isOpen: false, user: null, newStatus: 'ACTIVE', reason: '', loading: false })}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateStatusSubmit}
              disabled={statusModal.loading}
              className={`btn ${statusModal.newStatus === 'BLOCKED' ? 'btn-danger' : 'btn-primary'}`}
            >
              {statusModal.loading ? 'Updating...' : `Set Status to ${statusModal.newStatus}`}
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateStatusSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>New Account Status</label>
            <select
              value={statusModal.newStatus}
              onChange={(e) => setStatusModal((prev) => ({ ...prev, newStatus: e.target.value }))}
            >
              <option value="ACTIVE">ACTIVE (Full Platform Access)</option>
              <option value="BLOCKED">BLOCKED (Login & Bookings Prohibited)</option>
              <option value="SUSPENDED">SUSPENDED (Temporary Operational Hold)</option>
            </select>
          </div>

          <div>
            <label>Administrative Reason (Logged in Audit Trail)</label>
            <textarea
              rows={3}
              placeholder="State clear operational reason for this account status change..."
              value={statusModal.reason}
              onChange={(e) => setStatusModal((prev) => ({ ...prev, reason: e.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersListPage;
