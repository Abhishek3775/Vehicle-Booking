import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiDollarSign,
  FiCheckCircle,
  FiCreditCard,
  FiUser,
  FiCalendar,
  FiFileText,
  FiActivity
} from 'react-icons/fi';
import { paymentsApi } from '../../services/payments.api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingStates';
import { ErrorState } from '../../components/common/FeedbackStates';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const PaymentDetailsPage = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await paymentsApi.getPaymentById(paymentId);
      setPayment(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load payment transaction');
      showError(err.message || 'Failed to load payment transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner text="Fetching transaction ledger record..." />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <ErrorState
        title="Transaction Not Found"
        message={error || 'The requested payment record could not be retrieved.'}
        onRetry={fetchPaymentDetails}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/payments')}>
            <FiArrowLeft /> Back to Payments
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              Payment: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{payment.paymentReference || payment._id}</span>
              <StatusBadge status={payment.status} />
            </h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Logged on {formatDateTime(payment.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Settlement & Amount Summary */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiDollarSign style={{ color: 'var(--success)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Transaction Amount</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Amount Received</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
                {formatCurrency(payment.amount || 0)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Currency: {payment.currency || 'INR'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Settlement Status</div>
              <div style={{ marginTop: '0.25rem' }}>
                <StatusBadge status={payment.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Gateway & Settlement Metadata */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiCreditCard style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Gateway Details</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Gateway</div>
              <div style={{ fontWeight: 600 }}>{payment.gateway || 'CASH / MANUAL'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Method</div>
              <div style={{ fontWeight: 500 }}>{payment.paymentMethod || payment.method || 'ONLINE'}</div>
            </div>
            {payment.gatewayOrderId && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gateway Order ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{payment.gatewayOrderId}</div>
              </div>
            )}
            {payment.gatewayPaymentId && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gateway Payment ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{payment.gatewayPaymentId}</div>
              </div>
            )}
          </div>
        </div>

        {/* Associated Booking & Customer */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiUser style={{ color: 'var(--info)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Entity Associations</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer</div>
              <div style={{ fontWeight: 600 }}>{payment.user?.name || payment.customer?.name || 'Customer'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{payment.user?.phone || payment.customer?.phone || '—'}</div>
            </div>
            {payment.booking && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Linked Booking</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <Link
                    to={`/bookings/${typeof payment.booking === 'object' ? payment.booking._id : payment.booking}`}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                  >
                    View Booking Dossier
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentDetailsPage;
