import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiEye, FiRefreshCw, FiDollarSign } from 'react-icons/fi';
import { invoicesApi } from '../../services/invoices.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDateTime, formatCurrency } from '../../utils/formatters';
import { INVOICE_STATUS } from '../../utils/constants';

const InvoicesListPage = () => {
  const navigate = useNavigate();
  const { showError } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInvoices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await invoicesApi.getInvoices(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) || 1 };

      setInvoices(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 10,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
      showError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.limit, showError]);

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const statusOptions = Object.values(INVOICE_STATUS).map((s) => ({
    label: s.replace(/_/g, ' '),
    value: s,
  }));

  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoiceNumber',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
            {row.invoiceNumber || row._id.slice(-8).toUpperCase()}
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Issued: {formatDateTime(row.issuedAt || row.createdAt)}
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
      header: 'Booking Ref',
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
      header: 'Grand Total',
      accessor: 'totalAmount',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
          {formatCurrency(row.totalAmount || row.total || 0)}
        </span>
      ),
    },
    {
      header: 'Payment Status',
      accessor: 'paymentStatus',
      render: (row) => <StatusBadge status={row.paymentStatus || 'PENDING'} />,
    },
    {
      header: 'Invoice Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'ISSUED'} />,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="table-actions">
          <button
            className="action-btn"
            title="View Invoice Details"
            onClick={() => navigate(`/invoices/${row._id}`)}
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
            Tax Invoices & Billing
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Browse customer tax invoices, itemized service breakdowns, GST calculations, and billing status.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchInvoices(pagination.page)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <FilterBar
        searchPlaceholder="Search invoice #, customer..."
        searchValue={search}
        onSearchChange={setSearch}
        selectFilters={[
          {
            name: 'status',
            value: statusFilter,
            placeholder: 'All Invoice Statuses',
            options: statusOptions,
            onChange: setStatusFilter,
          },
        ]}
        onClearFilters={() => {
          setSearch('');
          setStatusFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        error={error}
        onRetry={() => fetchInvoices(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchInvoices(page)}
        emptyMessage="No invoices found matching criteria."
      />
    </div>
  );
};

export default InvoicesListPage;
