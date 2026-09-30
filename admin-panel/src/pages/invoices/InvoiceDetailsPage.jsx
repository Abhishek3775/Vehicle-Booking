import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiFileText,
  FiUser,
  FiTruck,
  FiCalendar,
  FiDollarSign,
  FiXCircle,
  FiCheckCircle,
  FiPrinter
} from 'react-icons/fi';
import { invoicesApi } from '../../services/invoices.api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingStates';
import { ErrorState } from '../../components/common/FeedbackStates';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const InvoiceDetailsPage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoicesApi.getInvoiceById(invoiceId);
      setInvoice(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load invoice');
      showError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
    }
  }, [invoiceId]);

  const handleCancelInvoice = async () => {
    try {
      setActionLoading(true);
      await invoicesApi.cancelInvoice(invoiceId, { reason: cancelReason });
      showSuccess('Invoice cancelled successfully');
      setCancelModalOpen(false);
      fetchInvoiceDetails();
    } catch (err) {
      showError(err.message || 'Failed to cancel invoice');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner text="Generating tax invoice..." />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <ErrorState
        title="Invoice Not Found"
        message={error || 'The requested tax invoice could not be located.'}
        onRetry={fetchInvoiceDetails}
      />
    );
  }

  const items = invoice.items || invoice.lineItems || [];
  const isCancellable = invoice.status !== 'CANCELLED';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/invoices')}>
            <FiArrowLeft /> Back to Invoices
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              Invoice: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{invoice.invoiceNumber || invoice._id}</span>
              <StatusBadge status={invoice.status || 'ISSUED'} />
              <StatusBadge status={invoice.paymentStatus || 'PENDING'} />
            </h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Issued on {formatDateTime(invoice.issuedAt || invoice.createdAt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => window.print()}>
            <FiPrinter /> Print Invoice
          </button>
          {isCancellable && (
            <button className="btn btn-danger" onClick={() => setCancelModalOpen(true)}>
              <FiXCircle /> Cancel Invoice
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Billed To (Customer) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiUser style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Billed To</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>
              {invoice.user?.name || invoice.customer?.name || 'Customer'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Phone: {invoice.user?.phone || invoice.customer?.phone || '—'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Email: {invoice.user?.email || invoice.customer?.email || '—'}
            </div>
          </div>
        </div>

        {/* Vehicle & Booking Reference */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiTruck style={{ color: 'var(--info)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Vehicle & Job Info</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invoice.vehicle && (
              <div>
                <div style={{ fontWeight: 600 }}>
                  {invoice.vehicle.make} {invoice.vehicle.model}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Reg: {invoice.vehicle.registrationNumber || 'N/A'}
                </div>
              </div>
            )}
            {invoice.booking && (
              <div style={{ marginTop: '0.5rem' }}>
                <Link
                  to={`/bookings/${typeof invoice.booking === 'object' ? invoice.booking._id : invoice.booking}`}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  View Related Booking
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Itemized Line Items Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          Itemized Service & Parts Breakdown
        </h3>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Unit Rate</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    Standard service package charges applied.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.description || item.name || item.serviceName || 'Service Item'}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', background: 'var(--background)', borderRadius: '4px' }}>
                        {item.type || 'SERVICE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice || item.price || 0)}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity || 1}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency((item.unitPrice || item.price || 0) * (item.quantity || 1))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Calculation */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal || invoice.totalAmount || 0)}</span>
            </div>
            {invoice.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--success)' }}>
                <span>Discount:</span>
                <span>- {formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>GST / Tax:</span>
                <span>+ {formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', borderTop: '2px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span>Grand Total:</span>
              <span>{formatCurrency(invoice.totalAmount || invoice.total || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <ConfirmModal
          isOpen={cancelModalOpen}
          title="Cancel Invoice"
          confirmText="Cancel Invoice"
          confirmVariant="danger"
          loading={actionLoading}
          onConfirm={handleCancelInvoice}
          onCancel={() => setCancelModalOpen(false)}
        >
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to void and cancel invoice <strong>{invoice.invoiceNumber || invoice._id}</strong>?
          </p>
          <div className="form-group">
            <label className="form-label">Cancellation Reason</label>
            <input
              type="text"
              className="form-control"
              placeholder="State reason for cancelling invoice..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default InvoiceDetailsPage;
