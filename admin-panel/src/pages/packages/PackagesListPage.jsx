import React, { useState, useEffect, useCallback } from 'react';
import {
  FiPackage,
  FiPlus,
  FiEdit,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiTrash2
} from 'react-icons/fi';
import { packagesApi } from '../../services/packages.api';
import { servicesApi } from '../../services/services.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatCurrency } from '../../utils/formatters';
import { VEHICLE_TYPES } from '../../utils/constants';

const PackagesListPage = () => {
  const { showSuccess, showError } = useToast();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Available active services to choose from
  const [availableServices, setAvailableServices] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Package Form Modal
  const [formModal, setFormModal] = useState({
    isOpen: false,
    isEdit: false,
    packageId: null,
    formData: {
      name: '',
      description: '',
      vehicleType: 'FOUR_WHEELER',
      services: [],
      price: '',
      originalPrice: '',
    },
  });

  // Status Change Modal
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    pkg: null,
    isActive: false,
  });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchPackages = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (vehicleTypeFilter) params.vehicleType = vehicleTypeFilter;
      if (statusFilter !== '') params.isActive = statusFilter;

      const res = await packagesApi.getPackages(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) || 1 };

      setPackages(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 10,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load service packages');
      showError(err.message || 'Failed to load service packages');
    } finally {
      setLoading(false);
    }
  }, [search, vehicleTypeFilter, statusFilter, pagination.limit, showError]);

  const loadServicesList = async () => {
    try {
      const res = await servicesApi.getServices({ limit: 100, isActive: 'true' });
      setAvailableServices(res.data || []);
    } catch (err) {
      console.error('Failed to load services for package selector', err);
    }
  };

  useEffect(() => {
    fetchPackages(1);
    loadServicesList();
  }, [fetchPackages]);

  const handleOpenCreate = () => {
    setFormModal({
      isOpen: true,
      isEdit: false,
      packageId: null,
      formData: {
        name: '',
        description: '',
        vehicleType: 'FOUR_WHEELER',
        services: [],
        price: '',
        originalPrice: '',
      },
    });
  };

  const handleOpenEdit = (pkg) => {
    const serviceIds = (pkg.services || []).map((s) => (typeof s === 'object' ? s._id : s));
    setFormModal({
      isOpen: true,
      isEdit: true,
      packageId: pkg._id,
      formData: {
        name: pkg.name || '',
        description: pkg.description || '',
        vehicleType: pkg.vehicleType || 'FOUR_WHEELER',
        services: serviceIds,
        price: pkg.price || '',
        originalPrice: pkg.originalPrice || '',
      },
    });
  };

  const handleServiceSelectToggle = (serviceId) => {
    const current = [...formModal.formData.services];
    const index = current.indexOf(serviceId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(serviceId);
    }

    // Auto-calculate suggested original price based on selected services basePrice
    const selectedObjList = availableServices.filter((s) => current.includes(s._id));
    const autoOriginal = selectedObjList.reduce((acc, s) => acc + (s.basePrice || 0), 0);

    setFormModal({
      ...formModal,
      formData: {
        ...formModal.formData,
        services: current,
        originalPrice: autoOriginal > 0 ? autoOriginal : formModal.formData.originalPrice,
      },
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { isEdit, packageId, formData } = formModal;

    if (!formData.name.trim()) {
      showError('Please provide package name');
      return;
    }
    if (formData.services.length === 0) {
      showError('Please select at least one service to include in this package');
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      showError('Please enter a valid package offer price');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        vehicleType: formData.vehicleType,
        services: formData.services,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice) || Number(formData.price),
      };

      if (isEdit) {
        await packagesApi.updatePackage(packageId, payload);
        showSuccess('Package updated successfully');
      } else {
        await packagesApi.createPackage(payload);
        showSuccess('New package created successfully');
      }

      setFormModal({ ...formModal, isOpen: false });
      fetchPackages(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to save package');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusModal.pkg) return;

    try {
      setActionLoading(true);
      await packagesApi.updatePackageStatus(statusModal.pkg._id, {
        isActive: statusModal.isActive,
      });
      showSuccess(`Package status updated to ${statusModal.isActive ? 'Active' : 'Inactive'}`);
      setStatusModal({ isOpen: false, pkg: null, isActive: false });
      fetchPackages(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to update package status');
    } finally {
      setActionLoading(false);
    }
  };

  const vehicleOptions = Object.values(VEHICLE_TYPES).map((vt) => ({
    label: vt.replace(/_/g, ' '),
    value: vt,
  }));

  const columns = [
    {
      header: 'Package Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.description ? (row.description.length > 50 ? `${row.description.slice(0, 50)}...` : row.description) : '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Vehicle Type',
      accessor: 'vehicleType',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
          {row.vehicleType?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Included Services',
      accessor: 'services',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {(row.services || []).length} Services
          </span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {(row.services || [])
              .map((s) => (typeof s === 'object' ? s.name : 'Service'))
              .slice(0, 2)
              .join(', ')}
            {(row.services || []).length > 2 ? '...' : ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Offer Price',
      accessor: 'price',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--success)' }}>
            {formatCurrency(row.price || 0)}
          </div>
          {row.originalPrice > row.price && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {formatCurrency(row.originalPrice)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="table-actions">
          <button
            className="action-btn"
            title="Edit Package"
            onClick={() => handleOpenEdit(row)}
          >
            <FiEdit />
          </button>
          <button
            className={`action-btn ${row.isActive ? 'delete' : ''}`}
            title={row.isActive ? 'Deactivate Package' : 'Activate Package'}
            onClick={() => setStatusModal({ isOpen: true, pkg: row, isActive: !row.isActive })}
          >
            {row.isActive ? <FiXCircle /> : <FiCheckCircle />}
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
            Service Packages
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage bundled service combinations and discounted promotional maintenance packages.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchPackages(pagination.page)}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <FiPlus /> Create Package
          </button>
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Search packages by name..."
        searchValue={search}
        onSearchChange={setSearch}
        selectFilters={[
          {
            name: 'vehicleType',
            value: vehicleTypeFilter,
            placeholder: 'All Vehicle Types',
            options: vehicleOptions,
            onChange: setVehicleTypeFilter,
          },
          {
            name: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: [
              { label: 'Active', value: 'true' },
              { label: 'Inactive', value: 'false' },
            ],
            onChange: setStatusFilter,
          },
        ]}
        onClearFilters={() => {
          setSearch('');
          setVehicleTypeFilter('');
          setStatusFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={packages}
        loading={loading}
        error={error}
        onRetry={() => fetchPackages(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchPackages(page)}
        emptyMessage="No packages match the selected criteria."
      />

      {/* Create / Edit Package Modal */}
      {formModal.isOpen && (
        <Modal
          isOpen={formModal.isOpen}
          title={formModal.isEdit ? 'Edit Service Package' : 'Create New Service Package'}
          onClose={() => setFormModal({ ...formModal, isOpen: false })}
        >
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                Package Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Comprehensive Annual Monsoon Care"
                value={formModal.formData.name}
                onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, name: e.target.value } })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Vehicle Type</label>
              <select
                className="form-control"
                value={formModal.formData.vehicleType}
                onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, vehicleType: e.target.value } })}
              >
                {Object.values(VEHICLE_TYPES).map((vt) => (
                  <option key={vt} value={vt}>
                    {vt.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Select Included Services ({formModal.formData.services.length} selected){' '}
                <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {availableServices.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active services found in catalog.</span>
                ) : (
                  availableServices.map((svc) => (
                    <label key={svc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer', padding: '0.25rem 0.5rem', background: formModal.formData.services.includes(svc._id) ? 'rgba(37, 99, 235, 0.08)' : 'transparent', borderRadius: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={formModal.formData.services.includes(svc._id)}
                          onChange={() => handleServiceSelectToggle(svc._id)}
                        />
                        {svc.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {formatCurrency(svc.basePrice || 0)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Original Standard Total (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 5000"
                  value={formModal.formData.originalPrice}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, originalPrice: e.target.value } })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Discounted Offer Price (₹) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 3999"
                  value={formModal.formData.price}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, price: e.target.value } })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description & Highlights</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Details of all inspections, oil flushes, and checks covered..."
                value={formModal.formData.description}
                onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, description: e.target.value } })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormModal({ ...formModal, isOpen: false })}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Saving...' : formModal.isEdit ? 'Save Changes' : 'Create Package'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Status Toggle Modal */}
      {statusModal.isOpen && (
        <ConfirmModal
          isOpen={statusModal.isOpen}
          title={statusModal.isActive ? 'Activate Package' : 'Deactivate Package'}
          confirmText={statusModal.isActive ? 'Activate' : 'Deactivate'}
          confirmVariant={statusModal.isActive ? 'primary' : 'danger'}
          loading={actionLoading}
          onConfirm={handleToggleStatus}
          onCancel={() => setStatusModal({ isOpen: false, pkg: null, isActive: false })}
        >
          <p>
            Are you sure you want to {statusModal.isActive ? 'activate' : 'deactivate'}{' '}
            <strong>{statusModal.pkg?.name}</strong>?
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default PackagesListPage;
