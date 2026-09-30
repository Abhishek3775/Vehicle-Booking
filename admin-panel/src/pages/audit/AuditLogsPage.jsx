import React, { useState, useEffect, useCallback } from 'react';
import { FiShield, FiRefreshCw, FiFilter, FiClock } from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import { formatDateTime } from '../../utils/formatters';

const AuditLogsPage = () => {
  const { showError } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (moduleFilter) params.module = moduleFilter;
      if (actionFilter) params.action = actionFilter;

      const res = await adminApi.getAuditLogs(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 15, total: data.length, totalPages: Math.ceil(data.length / 15) || 1 };

      setLogs(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 15,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
      showError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [search, moduleFilter, actionFilter, pagination.limit, showError]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const moduleOptions = [
    { label: 'Users', value: 'USER' },
    { label: 'Mechanics', value: 'MECHANIC' },
    { label: 'Bookings', value: 'BOOKING' },
    { label: 'Dispatch', value: 'DISPATCH' },
    { label: 'Inventory', value: 'INVENTORY' },
    { label: 'Services', value: 'SERVICE' },
    { label: 'Invoices', value: 'INVOICE' },
    { label: 'Auth / Admin', value: 'ADMIN' },
  ];

  const actionOptions = [
    { label: 'CREATE', value: 'CREATE' },
    { label: 'UPDATE', value: 'UPDATE' },
    { label: 'DELETE', value: 'DELETE' },
    { label: 'STATUS_CHANGE', value: 'STATUS_CHANGE' },
    { label: 'VERIFICATION', value: 'VERIFICATION' },
    { label: 'CANCEL', value: 'CANCEL' },
  ];

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'createdAt',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
          {formatDateTime(row.createdAt || row.timestamp)}
        </span>
      ),
    },
    {
      header: 'Admin Actor',
      accessor: 'admin',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.admin?.name || row.adminName || row.user?.name || 'System Admin'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.admin?.email || row.adminEmail || ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', background: 'var(--background)', borderRadius: '4px', border: '1px solid var(--border)' }}>
          {row.action}
        </span>
      ),
    },
    {
      header: 'Module',
      accessor: 'module',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.8125rem' }}>
          {row.module}
        </span>
      ),
    },
    {
      header: 'Entity / ID',
      accessor: 'entityId',
      render: (row) => (
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.entityType || 'Entity'}:</span>{' '}
          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {row.entityId ? (typeof row.entityId === 'object' ? row.entityId._id : row.entityId) : '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {row.description || row.details || '—'}
        </span>
      ),
    },
    {
      header: 'IP Address',
      accessor: 'ipAddress',
      render: (row) => (
        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {row.ipAddress || row.ip || '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Administrative Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Immutable security and compliance trail of all administrative actions, status overrides, and system changes.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchLogs(pagination.page)}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh Logs
        </button>
      </div>

      <FilterBar
        searchPlaceholder="Search description or entity ID..."
        searchValue={search}
        onSearchChange={setSearch}
        selectFilters={[
          {
            name: 'module',
            value: moduleFilter,
            placeholder: 'All Modules',
            options: moduleOptions,
            onChange: setModuleFilter,
          },
          {
            name: 'action',
            value: actionFilter,
            placeholder: 'All Actions',
            options: actionOptions,
            onChange: setActionFilter,
          },
        ]}
        onClearFilters={() => {
          setSearch('');
          setModuleFilter('');
          setActionFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        error={error}
        onRetry={() => fetchLogs(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchLogs(page)}
        emptyMessage="No audit log records recorded yet."
      />
    </div>
  );
};

export default AuditLogsPage;
