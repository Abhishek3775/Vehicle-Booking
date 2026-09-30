import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBox,
  FiPlus,
  FiEdit,
  FiSliders,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiAlertTriangle
} from 'react-icons/fi';
import { inventoryApi } from '../../services/inventory.api';
import { useToast } from '../../context/ToastContext';
import DataTable from '../../components/common/DataTable';
import FilterBar from '../../components/common/FilterBar';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatCurrency } from '../../utils/formatters';
import { PART_CATEGORIES } from '../../utils/constants';

const InventoryListPage = () => {
  const { showSuccess, showError } = useToast();

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState('');

  // Part Form Modal (Create / Edit)
  const [formModal, setFormModal] = useState({
    isOpen: false,
    isEdit: false,
    partId: null,
    formData: {
      name: '',
      sku: '',
      category: 'BRAKES',
      price: '',
      costPrice: '',
      stockQuantity: '',
      minStockThreshold: '5',
      unit: 'PIECE',
      description: '',
    },
  });

  // Stock Adjustment Modal
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    part: null,
    operation: 'ADD', // 'ADD', 'REMOVE', 'SET'
    quantity: '',
    reason: '',
  });

  // Status Change Modal
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    part: null,
    isActive: false,
  });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchParts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (lowStockFilter === 'true') params.lowStock = true;

      const res = await inventoryApi.getParts(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 10, total: data.length, totalPages: Math.ceil(data.length / 10) || 1 };

      setParts(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 10,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load inventory parts');
      showError(err.message || 'Failed to load inventory parts');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, lowStockFilter, pagination.limit, showError]);

  useEffect(() => {
    fetchParts(1);
  }, [fetchParts]);

  const handleOpenCreate = () => {
    setFormModal({
      isOpen: true,
      isEdit: false,
      partId: null,
      formData: {
        name: '',
        sku: '',
        category: 'BRAKES',
        price: '',
        costPrice: '',
        stockQuantity: '0',
        minStockThreshold: '5',
        unit: 'PIECE',
        description: '',
      },
    });
  };

  const handleOpenEdit = (part) => {
    setFormModal({
      isOpen: true,
      isEdit: true,
      partId: part._id,
      formData: {
        name: part.name || '',
        sku: part.sku || '',
        category: part.category || 'BRAKES',
        price: part.price || '',
        costPrice: part.costPrice || '',
        stockQuantity: part.stockQuantity || '0',
        minStockThreshold: part.minStockThreshold || '5',
        unit: part.unit || 'PIECE',
        description: part.description || '',
      },
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { isEdit, partId, formData } = formModal;

    if (!formData.name.trim() || !formData.sku.trim()) {
      showError('Please provide part name and SKU');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        name: formData.name,
        sku: formData.sku.toUpperCase(),
        category: formData.category,
        price: Number(formData.price) || 0,
        costPrice: Number(formData.costPrice) || 0,
        stockQuantity: Number(formData.stockQuantity) || 0,
        minStockThreshold: Number(formData.minStockThreshold) || 5,
        unit: formData.unit,
        description: formData.description,
      };

      if (isEdit) {
        await inventoryApi.updatePart(partId, payload);
        showSuccess('Part record updated successfully');
      } else {
        await inventoryApi.createPart(payload);
        showSuccess('New inventory part registered successfully');
      }

      setFormModal({ ...formModal, isOpen: false });
      fetchParts(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to save inventory part');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStockAdjustmentSubmit = async (e) => {
    e.preventDefault();
    const { part, operation, quantity, reason } = stockModal;

    if (!quantity || Number(quantity) <= 0) {
      showError('Please enter a valid non-zero adjustment quantity');
      return;
    }

    try {
      setActionLoading(true);
      await inventoryApi.adjustStock(part._id, {
        operation,
        quantity: Number(quantity),
        reason: reason || `Admin adjusted stock via ${operation}`,
      });

      showSuccess(`Stock adjusted successfully for ${part.name}`);
      setStockModal({ isOpen: false, part: null, operation: 'ADD', quantity: '', reason: '' });
      fetchParts(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to adjust stock');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusModal.part) return;

    try {
      setActionLoading(true);
      await inventoryApi.updatePartStatus(statusModal.part._id, {
        isActive: statusModal.isActive,
      });
      showSuccess(`Part status set to ${statusModal.isActive ? 'Active' : 'Inactive'}`);
      setStatusModal({ isOpen: false, part: null, isActive: false });
      fetchParts(pagination.page);
    } catch (err) {
      showError(err.message || 'Failed to update part status');
    } finally {
      setActionLoading(false);
    }
  };

  const categoryOptions = Object.values(PART_CATEGORIES).map((c) => ({
    label: c.replace(/_/g, ' '),
    value: c,
  }));

  const columns = [
    {
      header: 'SKU / Part Name',
      accessor: 'sku',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
            {row.sku}
          </span>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
            {row.name}
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
          {row.category?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Selling Price',
      accessor: 'price',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--success)' }}>
          {formatCurrency(row.price || 0)}
        </span>
      ),
    },
    {
      header: 'Stock / Reserved / Avail',
      accessor: 'stockQuantity',
      render: (row) => {
        const stock = row.stockQuantity ?? 0;
        const reserved = row.reservedQuantity ?? 0;
        const available = row.availableQuantity ?? (stock - reserved);
        const isLow = available <= (row.minStockThreshold || 5);

        return (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{available}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ({stock} total, {reserved} rsvd)
              </span>
            </div>
            {isLow && (
              <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <FiAlertTriangle /> Low Stock (Min: {row.minStockThreshold || 5})
              </span>
            )}
          </div>
        );
      },
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
            title="Adjust Stock Level"
            onClick={() => setStockModal({ isOpen: true, part: row, operation: 'ADD', quantity: '', reason: '' })}
          >
            <FiSliders />
          </button>
          <button
            className="action-btn"
            title="Edit Part Details"
            onClick={() => handleOpenEdit(row)}
          >
            <FiEdit />
          </button>
          <button
            className={`action-btn ${row.isActive ? 'delete' : ''}`}
            title={row.isActive ? 'Deactivate Part' : 'Activate Part'}
            onClick={() => setStatusModal({ isOpen: true, part: row, isActive: !row.isActive })}
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
            Inventory & Spare Parts
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage warehouse inventory, SKU catalog, stock reservations, and replenishment thresholds.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchParts(pagination.page)}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <FiPlus /> Add New Part
          </button>
        </div>
      </div>

      <FilterBar
        searchPlaceholder="Search by part name or SKU..."
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
            name: 'lowStock',
            value: lowStockFilter,
            placeholder: 'All Stock Levels',
            options: [
              { label: 'Low Stock Only', value: 'true' },
            ],
            onChange: setLowStockFilter,
          },
        ]}
        onClearFilters={() => {
          setSearch('');
          setCategoryFilter('');
          setLowStockFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={parts}
        loading={loading}
        error={error}
        onRetry={() => fetchParts(pagination.page)}
        pagination={pagination}
        onPageChange={(page) => fetchParts(page)}
        emptyMessage="No spare parts match the selected criteria."
      />

      {/* Create / Edit Part Modal */}
      {formModal.isOpen && (
        <Modal
          isOpen={formModal.isOpen}
          title={formModal.isEdit ? 'Edit Spare Part' : 'Add New Spare Part'}
          onClose={() => setFormModal({ ...formModal, isOpen: false })}
        >
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">
                  SKU Code <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. BRK-PAD-001"
                  value={formModal.formData.sku}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, sku: e.target.value.toUpperCase() } })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={formModal.formData.category}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, category: e.target.value } })}
                >
                  {Object.values(PART_CATEGORIES).map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Part Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bosch Ceramic Front Brake Pads Set"
                value={formModal.formData.name}
                onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, name: e.target.value } })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 2400"
                  value={formModal.formData.price}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, price: e.target.value } })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cost Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 1600"
                  value={formModal.formData.costPrice}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, costPrice: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="0"
                  value={formModal.formData.stockQuantity}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, stockQuantity: e.target.value } })}
                  disabled={formModal.isEdit}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Low Stock Threshold</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  placeholder="5"
                  value={formModal.formData.minStockThreshold}
                  onChange={(e) => setFormModal({ ...formModal, formData: { ...formModal.formData, minStockThreshold: e.target.value } })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Compatibility Notes</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Details of vehicle specifications and fitment..."
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
                {actionLoading ? 'Saving...' : formModal.isEdit ? 'Save Changes' : 'Create Part'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stock Adjustment Modal */}
      {stockModal.isOpen && (
        <Modal
          isOpen={stockModal.isOpen}
          title={`Adjust Stock: ${stockModal.part?.name}`}
          onClose={() => setStockModal({ isOpen: false, part: null, operation: 'ADD', quantity: '', reason: '' })}
        >
          <form onSubmit={handleStockAdjustmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
              <div>SKU: <strong>{stockModal.part?.sku}</strong></div>
              <div>Current Total Stock: <strong>{stockModal.part?.stockQuantity || 0}</strong></div>
              <div>Currently Reserved: <strong>{stockModal.part?.reservedQuantity || 0}</strong></div>
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment Operation</label>
              <select
                className="form-control"
                value={stockModal.operation}
                onChange={(e) => setStockModal({ ...stockModal, operation: e.target.value })}
              >
                <option value="ADD">ADD (Restock / Goods Received)</option>
                <option value="REMOVE">REMOVE (Damaged / Return)</option>
                <option value="SET">SET (Manual Physical Audit Count)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Quantity <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="Enter unit count..."
                value={stockModal.quantity}
                onChange={(e) => setStockModal({ ...stockModal, quantity: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment Reason / Reference</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. PO-2026-09 supplier shipment restock..."
                value={stockModal.reason}
                onChange={(e) => setStockModal({ ...stockModal, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStockModal({ isOpen: false, part: null, operation: 'ADD', quantity: '', reason: '' })}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Applying...' : 'Apply Stock Change'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Status Toggle Modal */}
      {statusModal.isOpen && (
        <ConfirmModal
          isOpen={statusModal.isOpen}
          title={statusModal.isActive ? 'Activate Part' : 'Deactivate Part'}
          confirmText={statusModal.isActive ? 'Activate' : 'Deactivate'}
          confirmVariant={statusModal.isActive ? 'primary' : 'danger'}
          loading={actionLoading}
          onConfirm={handleToggleStatus}
          onCancel={() => setStatusModal({ isOpen: false, part: null, isActive: false })}
        >
          <p>
            Are you sure you want to {statusModal.isActive ? 'activate' : 'deactivate'}{' '}
            <strong>{statusModal.part?.name}</strong>?
          </p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default InventoryListPage;
