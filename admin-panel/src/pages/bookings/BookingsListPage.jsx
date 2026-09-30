import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiEye, FiXCircle, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDateTime, formatCurrency } from '../../utils/formatters';
import { BOOKING_STATUS, BOOKING_TYPES } from '../../utils/constants';

const BookingsListPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Cancellation Modal State
  const [cancelModal, setCancelModal] = useState({ isOpen: false, booking: null, reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.bookingType = typeFilter;

      const res = await adminApi.getBookings(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) || 1 };

      setBookings(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 10,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
      showError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, pagination.limit, showError]);

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  const handleCancelBooking = async () => {
    if (!cancelModal.booking) return;
    if (!cancelModal.reason.trim()) {
      showError('Please provide a cancellation reason');
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.cancelBooking(cancelModal.booking._id, { reason: cancelModal.reason });
      showSuccess(`Booking ${cancelModal.booking.bookingReference || ''} cancelled successfully`);
      setCancelModal({ isOpen: false, booking: null, reason: '' });
      fetchBookings(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  const statusOptions = Object.values(BOOKING_STATUS).map((status) => ({
    label: status.replace(/_/g, ' '),
    value: status,
  }));

  const typeOptions = Object.values(BOOKING_TYPES).map((type) => ({
    label: type.replace(/_/g, ' '),
    value: type,
  }));

  const columns = [
    {
      header: 'Booking Ref',
      accessor: 'bookingReference',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
            {row.bookingReference || row._id.slice(-8).toUpperCase()}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.bookingType || 'STANDARD'}
          </div>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
            {row.user?.name || row.customer?.name || 'Customer'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.user?.phone || row.customer?.phone || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      accessor: 'vehicle',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {row.vehicle?.make} {row.vehicle?.model}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.vehicle?.registrationNumber || row.vehicle?.vehicleType || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Service / Package',
      accessor: 'service',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {row.service?.name || row.package?.name || 'Custom Service'}
          </div>
          {row.totalEstimatedPrice > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
              {formatCurrency(row.totalEstimatedPrice)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Mechanic',
      accessor: 'mechanic',
      render: (row) => (
        <div>
          {row.mechanic ? (
            <div>
              <span style={{ fontWeight: 500 }}>{row.mechanic.name}</span>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {row.mechanic.mechanicCode || row.mechanic.phone}
              </div>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Unassigned
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Scheduled / Created',
      accessor: 'createdAt',
      render: (row) => (
        <div style={{ fontSize: '0.8125rem' }}>
          {row.scheduledDate ? (
            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {formatDateTime(row.scheduledDate)}
            </div>
          ) : (
            <div>{formatDateTime(row.createdAt)}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="table-actions">
          <button
            className="action-btn"
            title="View Booking Details"
            onClick={() => navigate(`/bookings/${row._id}`)}
          >
            <FiEye />
          </button>
          {!['COMPLETED', 'CANCELLED'].includes(row.status) && (
            <button
              className="action-btn delete"
              title="Cancel Booking"
              onClick={() => setCancelModal({ isOpen: true, booking: row, reason: '' })}
            >
              <FiXCircle />
            </button>
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
            Bookings Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Monitor, filter, inspect and manage customer service and emergency bookings.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchBookings(pagination.page)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <FilterBar
        searchPlaceholder="Search by reference, customer name..."
        searchValue={search}
        onSearchChange={setSearch}
        selectFilters={[
          {
            name: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: statusOptions,
            onChange: setStatusFilter,
          },
          {
            name: 'type',
            value: typeFilter,
            placeholder: 'All Booking Types',
            options: typeOptions,
            onChange: setTypeFilter,
          },
        ]}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('');
          setTypeFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={bookings}
        loading={loading}
        error={error}
        onRetry={() => fetchBookings(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchBookings(page)}
        emptyMessage="No bookings match the selected criteria."
      />

      {/* Cancellation Reason Modal */}
      {cancelModal.isOpen && (
        <ConfirmModal
          isOpen={cancelModal.isOpen}
          title="Cancel Booking"
          confirmText="Cancel Booking"
          confirmVariant="danger"
          loading={actionLoading}
          onConfirm={handleCancelBooking}
          onCancel={() => setCancelModal({ isOpen: false, booking: null, reason: '' })}
        >
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to cancel booking <strong>{cancelModal.booking?.bookingReference || cancelModal.booking?._id}</strong>?
            This will halt all dispatch and inspection operations.
          </p>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Cancellation Reason <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Provide a mandatory reason for cancellation..."
              value={cancelModal.reason}
              onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
              required
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default BookingsListPage;
