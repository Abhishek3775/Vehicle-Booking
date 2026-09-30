import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCalendar,
  FiUser,
  FiTruck,
  FiMapPin,
  FiDollarSign,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiTool,
  FiShield,
  FiClock,
  FiLayers
} from 'react-icons/fi';
import { adminApi } from '../../services/admin.api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingStates';
import { ErrorState } from '../../components/common/FeedbackStates';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getBookingById(bookingId);
      setBooking(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load booking details');
      showError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      showError('Please provide a cancellation reason');
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.cancelBooking(bookingId, { reason: cancelReason });
      showSuccess('Booking cancelled successfully');
      setCancelModalOpen(false);
      fetchBookingDetails();
    } catch (err) {
      showError(err.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner text="Loading booking dossier..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <ErrorState
        title="Failed to Load Booking"
        message={error || 'Booking was not found.'}
        onRetry={fetchBookingDetails}
      />
    );
  }

  const isCancellable = !['COMPLETED', 'CANCELLED'].includes(booking.status);

  return (
    <div>
      {/* Top Breadcrumb / Action header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => navigate('/bookings')}>
            <FiArrowLeft /> Back to Bookings
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              Booking: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{booking.bookingReference || booking._id}</span>
              <StatusBadge status={booking.status} />
            </h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Created on {formatDateTime(booking.createdAt)} • Type: <strong>{booking.bookingType || 'STANDARD'}</strong>
            </div>
          </div>
        </div>

        {isCancellable && (
          <button className="btn btn-danger" onClick={() => setCancelModalOpen(true)}>
            <FiXCircle /> Cancel Booking
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Customer Information */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiUser style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Customer Profile</h2>
          </div>
          {booking.user || booking.customer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Name</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {booking.user?.name || booking.customer?.name || 'Customer'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</div>
                <div style={{ fontWeight: 500 }}>{booking.user?.phone || booking.customer?.phone || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</div>
                <div style={{ fontWeight: 500 }}>{booking.user?.email || booking.customer?.email || '—'}</div>
              </div>
              {booking.user?._id && (
                <div style={{ marginTop: '0.5rem' }}>
                  <Link to={`/users/${booking.user._id}`} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    View User Dossier
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Customer details not attached.</p>
          )}
        </div>

        {/* Vehicle Information */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiTruck style={{ color: 'var(--info)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Vehicle Details</h2>
          </div>
          {booking.vehicle ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Make & Model</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.year || 'N/A'})
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reg Number</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {booking.vehicle.registrationNumber || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vehicle Type</div>
                  <div style={{ fontWeight: 500 }}>{booking.vehicle.vehicleType || 'FOUR_WHEELER'}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fuel Type</div>
                <div style={{ fontWeight: 500 }}>{booking.vehicle.fuelType || 'PETROL'}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No vehicle details specified.</p>
          )}
        </div>

        {/* Service / Package Info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiLayers style={{ color: 'var(--warning)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Service & Charges</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Service Requested</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {booking.service?.name || booking.package?.name || 'Standard Vehicle Inspection'}
              </div>
              {booking.service?.category && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Category: {booking.service.category}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Pricing</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                {formatCurrency(booking.totalEstimatedPrice || booking.service?.basePrice || 0)}
              </div>
            </div>
            {booking.scheduledDate && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scheduled Slot</div>
                <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FiClock style={{ color: 'var(--primary)' }} /> {formatDateTime(booking.scheduledDate)}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Service Address & Coordinates */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiMapPin style={{ color: 'var(--danger)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Service Location</h2>
          </div>
          {booking.address || booking.pickupAddress ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {booking.address?.addressLine1 || booking.pickupAddress?.addressLine1 || 'Street Address'}
                </div>
                {booking.address?.addressLine2 && (
                  <div style={{ color: 'var(--text-secondary)' }}>{booking.address.addressLine2}</div>
                )}
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {booking.address?.city || booking.pickupAddress?.city || ''},{' '}
                  {booking.address?.state || booking.pickupAddress?.state || ''}{' '}
                  {booking.address?.pincode || booking.pickupAddress?.pincode || ''}
                </div>
              </div>
              {booking.location?.coordinates && (
                <div style={{ fontSize: '0.8rem', background: 'var(--background)', padding: '0.5rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                  GPS: {booking.location.coordinates[1]?.toFixed(5)}, {booking.location.coordinates[0]?.toFixed(5)}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Location address recorded as spot pickup.</p>
          )}
        </div>

        {/* Assigned Mechanic / Dispatch */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiTool style={{ color: 'var(--primary)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Mechanic Assignment</h2>
          </div>
          {booking.mechanic ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{booking.mechanic.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Code: {booking.mechanic.mechanicCode || 'N/A'} • {booking.mechanic.phone}
                  </div>
                </div>
                <StatusBadge status={booking.mechanic.verificationStatus || 'VERIFIED'} />
              </div>
              <div>
                <Link to={`/mechanics/${booking.mechanic._id}`} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  View Mechanic Details
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No mechanic currently assigned to this booking.</p>
              <Link to="/dispatch" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Open Dispatch Board
              </Link>
            </div>
          )}
        </div>

        {/* Notes & Description */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <FiFileText style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Issue Description & Notes</h2>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Customer Remarks</div>
            <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem', minHeight: '60px' }}>
              {booking.customerNotes || booking.description || booking.issueDescription || 'No specific notes recorded for this booking.'}
            </div>
          </div>
          {booking.cancellationReason && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--danger)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)' }}>Cancellation Reason:</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{booking.cancellationReason}</div>
            </div>
          )}
        </div>

      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <ConfirmModal
          isOpen={cancelModalOpen}
          title="Cancel Booking"
          confirmText="Cancel Booking"
          confirmVariant="danger"
          loading={actionLoading}
          onConfirm={handleCancelBooking}
          onCancel={() => setCancelModalOpen(false)}
        >
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to cancel booking <strong>{booking.bookingReference || booking._id}</strong>?
          </p>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Cancellation Reason <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="State the reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default BookingDetailsPage;
