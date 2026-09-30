import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDollarSign, FiEye, FiRefreshCw, FiCreditCard } from 'react-icons/fi';
import { paymentsApi } from '../../services/payments.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDateTime, formatCurrency } from '../../utils/formatters';
import { PAYMENT_STATUS } from '../../utils/constants';

const PaymentsListPage = () => {
  const navigate = useNavigate();
  const { showError } = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');

  const fetchPayments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (gatewayFilter) params.gateway = gatewayFilter;

      const res = await paymentsApi.getPayments(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) || 1 };

      setPayments(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 10,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load payments ledger');
      showError(err.message || 'Failed to load payments ledger');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, gatewayFilter, pagination.limit, showError]);

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const statusOptions = Object.values(PAYMENT_STATUS).map((s) => ({
    label: s.replace(/_/g, ' '),
    value: s,
  }));

  const gatewayOptions = [
    { label: 'Razorpay', value: 'RAZORPAY' },
    { label: 'Cash On Delivery', value: 'CASH' },
    { label: 'UPI / Manual', value: 'MANUAL' },
  ];

  const columns = [
    {
      header: 'Payment Reference',
      accessor: 'paymentReference',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
            {row.paymentReference || (row.transactionId ? row.transactionId.slice(-10).toUpperCase() : row._id.slice(-8).toUpperCase())}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Gateway: <strong>{row.gateway || 'CASH'}</strong>
          </div>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.user?.name || row.customer?.name || 'Customer'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.user?.phone || row.customer?.phone || '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Booking Reference',
      accessor: 'booking',
      render: (row) => (
        <div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            {row.booking?.bookingReference || (typeof row.booking === 'string' ? row.booking.slice(-8).toUpperCase() : '—')}
          </span>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>
          {formatCurrency(row.amount || 0)}
        </span>
      ),
    },
    {
      header: 'Method',
      accessor: 'paymentMethod',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
          {row.paymentMethod || row.method || 'ONLINE'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Processed At',
      accessor: 'createdAt',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem' }}>
          {formatDateTime(row.paidAt || row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="table-actions">
          <button
            className="action-btn"
            title="View Payment Transaction"
            onClick={() => navigate(`/payments/${row._id}`)}
          >
            <FiEye />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Payments & Transactions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Audit payment receipts, gateway settlements, customer transactions, and payment statuses.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchPayments(pagination.page)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh Ledger
        </button>
      </div>

      <FilterBar
        searchPlaceholder="Search reference, transaction ID..."
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
            name: 'gateway',
            value: gatewayFilter,
            placeholder: 'All Gateways',
            options: gatewayOptions,
            onChange: setGatewayFilter,
          },
        ]}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('');
          setGatewayFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        error={error}
        onRetry={() => fetchPayments(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchPayments(page)}
        emptyMessage="No payment transactions found matching the filter."
      />
    </div>
  );
};

export default PaymentsListPage;
