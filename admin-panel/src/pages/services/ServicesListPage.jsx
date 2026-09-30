import React, { useState, useEffect, useCallback } from 'react';
import {
  FiLayers,
  FiPlus,
  FiEdit,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw
} from 'react-icons/fi';
import { servicesApi } from '../../services/services.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatCurrency } from '../../utils/formatters';
import { SERVICE_CATEGORIES, VEHICLE_TYPES } from '../../utils/constants';

const ServicesListPage = () => {
  const { showSuccess, showError } = useToast();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Service Form Modal (Create / Edit)
  const [formModal, setFormModal] = useState({
    isOpen: false,
    isEdit: false,
    serviceId: null,
    formData: {
      name: '',
      description: '',
      category: 'GENERAL_SERVICE',
      basePrice: '',
      estimatedDurationMinutes: '',
      vehicleTypes: ['FOUR_WHEELER'],
    },
  });

  // Status Change Modal
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    service: null,
    isActive: false,
  });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchServices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter !== '') params.isActive = statusFilter;

      const res = await servicesApi.getServices(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) || 1 };

      setServices(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 10,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load services catalog');
      showError(err.message || 'Failed to load services catalog');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, pagination.limit, showError]);

  useEffect(() => {
    fetchServices(1);
  }, [fetchServices]);

  const handleOpenCreate = () => {
    setFormModal({
      isOpen: true,
      isEdit: false,
      serviceId: null,
      formData: {
        name: '',
        description: '',
        category: 'GENERAL_SERVICE',
        basePrice: '',
        estimatedDurationMinutes: '',
        vehicleTypes: ['FOUR_WHEELER'],
      },
    });
  };

  const handleOpenEdit = (service) => {
    setFormModal({
      isOpen: true,
      isEdit: true,
      serviceId: service._id,
      formData: {
        name: service.name || '',
        description: service.description || '',
        category: service.category || 'GENERAL_SERVICE',
        basePrice: service.basePrice || '',
        estimatedDurationMinutes: service.estimatedDurationMinutes || '',
        vehicleTypes: service.vehicleTypes || ['FOUR_WHEELER'],
      },
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { isEdit, serviceId, formData } = formModal;

    if (!formData.name.trim()) {
      showError('Please enter service name');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        basePrice: Number(formData.basePrice) || 0,
        estimatedDurationMinutes: Number(formData.estimatedDurationMinutes) || 30,
        vehicleTypes: formData.vehicleTypes,
      };

      if (isEdit) {
        await servicesApi.updateService(serviceId, payload);
        showSuccess('Service updated successfully');
      } else {
        await servicesApi.createService(payload);
        showSuccess('New service created successfully');
      }

      setFormModal({ ...formModal, isOpen: false });
      fetchServices(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to save service');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusModal.service) return;

    try {
      setActionLoading(true);
      await servicesApi.updateServiceStatus(statusModal.service._id, {
        isActive: statusModal.isActive,
      });
      showSuccess(`Service status updated to ${statusModal.isActive ? 'Active' : 'Inactive'}`);
      setStatusModal({ isOpen: false, service: null, isActive: false });
      fetchServices(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to update service status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVehicleTypeToggle = (type) => {
    const current = [...formModal.formData.vehicleTypes];
    const index = current.indexOf(type);
    if (index > -1) {
      if (current.length > 1) {
        current.splice(index, 1);
      }
    } else {
      current.push(type);
    }
    setFormModal({
      ...formModal,
      formData: { ...formModal.formData, vehicleTypes: current },
    });
  };

  const categoryOptions = Object.values(SERVICE_CATEGORIES).map((cat) => ({
    label: cat.replace(/_/g, ' '),
    value: cat,
  }));

  const columns = [
    {
      header: 'Service Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.description ? (row.description.length > 60 ? `${row.description.slice(0, 60)}...` : row.description) : '—'}
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--primary)' }}>
          {row.category?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Base Price',
      accessor: 'basePrice',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--success)' }}>
          {formatCurrency(row.basePrice || 0)}
        </span>
      ),
    },
    {
      header: 'Est Duration',
      accessor: 'estimatedDurationMinutes',
      render: (row) => <span>{row.estimatedDurationMinutes ? `${row.estimatedDurationMinutes} mins` : '—'}</span>,
    },
    {
      header: 'Vehicles Supported',
      accessor: 'vehicleTypes',
      render: (row) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {(row.vehicleTypes || []).map((vt) => (
            <span key={vt} style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: 'var(--background)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              {vt.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="table-actions">
          <button
            className="action-btn"
            title="Edit Service"
            onClick={() => handleOpenEdit(row)}
          >
            <FiEdit />
          </button>
          <button
            className={`action-btn ${row.isActive ? 'delete' : ''}`}
            title={row.isActive ? 'Deactivate Service' : 'Activate Service'}
            onClick={() => setStatusModal({ isOpen: true, service: row, isActive: !row.isActive })}
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
            Services Catalog
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Configure available roadside, maintenance, and vehicle repair services and base pricing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchServices(pagination.page)}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <FiPlus /> Add New Service
          </button>
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Search services by name..."
        searchValue={search}
        onSearchChange={setSearch}
        selectFilters={[
          {
            name: 'category',
            value: categoryFilter,
            placeholder: 'All Categories',
            options: categoryOptions,
            onChange: setCategoryFilter,
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
          setCategoryFilter('');
          setStatusFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={services}
        loading={loading}
        error={error}
        onRetry={() => fetchServices(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchServices(page)}
        emptyMessage="No services match the selected criteria."
      />

      {/* Create / Edit Service Modal */}
      {formModal.isOpen && (
        <Modal
          isOpen={formModal.isOpen}
          title={formModal.isEdit ? 'Edit Service' : 'Add New Service'}
          onClose={() => setFormModal({ ...formModal, isOpen: false })}
        >
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                Service Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Full Brake Inspection & Service"
                value={formModal.formData.name}
                onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, name: e.target.value } })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={formModal.formData.category}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, category: e.target.value } })}
                >
                  {Object.values(SERVICE_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Base Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 1500"
                  value={formModal.formData.basePrice}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, basePrice: e.target.value } })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Duration (Minutes)</label>
              <input
                type="number"
                min="5"
                className="form-control"
                placeholder="e.g. 45"
                value={formModal.formData.estimatedDurationMinutes}
                onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, estimatedDurationMinutes: e.target.value } })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Compatible Vehicle Types</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
                {Object.values(VEHICLE_TYPES).map((vt) => (
                  <label key={vt} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formModal.formData.vehicleTypes.includes(vt)}
                      onChange={() => handleVehicleTypeToggle(vt)}
                    />
                    {vt.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Describe what is included in this service..."
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
                {actionLoading ? 'Saving...' : formModal.isEdit ? 'Save Changes' : 'Create Service'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Status Toggle Modal */}
      {statusModal.isOpen && (
        <ConfirmModal
          isOpen={statusModal.isOpen}
          title={statusModal.isActive ? 'Activate Service' : 'Deactivate Service'}
          confirmText={statusModal.isActive ? 'Activate' : 'Deactivate'}
          confirmVariant={statusModal.isActive ? 'primary' : 'danger'}
          loading={actionLoading}
          onConfirm={handleToggleStatus}
          onCancel={() => setStatusModal({ isOpen: false, service: null, isActive: false })}
        >
          <p>
            Are you sure you want to {statusModal.isActive ? 'activate' : 'deactivate'}{' '}
            <strong>{statusModal.service?.name}</strong>?
            {!statusModal.isActive && ' Customers will no longer be able to select this service in new bookings.'}
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default ServicesListPage;
