import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiTrash2,
  FiRefreshCw,
  FiInfo,
  FiAlertTriangle,
  FiCheckSquare
} from 'react-icons/fi';
import { notificationsApi } from '../../services/notifications.api';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/common/LoadingStates';
import { EmptyState, ErrorState } from '../../components/common/FeedbackStates';
import Pagination from '../../components/common/Pagination';
import { formatRelativeTime, formatDateTime } from '../../utils/formatters';

const NotificationsPage = () => {
  const { showSuccess, showError } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };
      if (unreadOnly) params.unreadOnly = true;

      const res = await notificationsApi.getNotifications(params);
      const data = res.data || [];
      const meta = res.meta || { page, limit: 15, total: data.length, totalPages: Math.ceil(data.length / 15) || 1 };

      setNotifications(data);
      setPagination({
        page: Number(meta.page) || 1,
        limit: Number(meta.limit) || 15,
        total: Number(meta.total) || 0,
        totalPages: Number(meta.totalPages) || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
      showError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, pagination.limit, showError]);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      showError(err.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      await notificationsApi.markAllAsRead();
      showSuccess('All notifications marked as read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      showError(err.message || 'Failed to mark all as read');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationsApi.deleteNotification(id);
      showSuccess('Notification dismissed');
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      showError(err.message || 'Failed to delete notification');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            System Notifications
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Real-time administrative alerts, system broadcasts, mechanic dispatch signals, and payment triggers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchNotifications(pagination.page)}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            className="btn btn-outline"
            onClick={handleMarkAllAsRead}
            disabled={actionLoading || notifications.length === 0}
          >
            <FiCheckSquare /> Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${!unreadOnly ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
          onClick={() => setUnreadOnly(false)}
        >
          All Notifications
        </button>
        <button
          className={`btn ${unreadOnly ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}
          onClick={() => setUnreadOnly(true)}
        >
          Unread Only
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <LoadingSpinner text="Fetching notifications feed..." />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchNotifications(pagination.page)} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={FiBell}
          title="No Notifications Found"
          description={unreadOnly ? 'You have no unread notifications.' : 'No notification history available.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((item) => (
            <div
              key={item._id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '1rem 1.25rem',
                borderLeft: item.isRead ? '3px solid transparent' : '3px solid var(--primary)',
                background: item.isRead ? 'var(--surface)' : 'rgba(37, 99, 235, 0.03)',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: item.isRead ? 'var(--background)' : 'rgba(37, 99, 235, 0.1)',
                    color: item.isRead ? 'var(--text-muted)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}
                >
                  <FiBell />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: item.isRead ? 600 : 700, margin: 0, color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                    {item.category && (
                      <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--background)', borderRadius: '4px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.35rem 0 0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {item.body || item.message}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatRelativeTime(item.createdAt)} • {formatDateTime(item.createdAt)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                {!item.isRead && (
                  <button
                    className="action-btn"
                    title="Mark as Read"
                    onClick={() => handleMarkAsRead(item._id)}
                  >
                    <FiCheck />
                  </button>
                )}
                <button
                  className="action-btn delete"
                  title="Delete Notification"
                  onClick={() => handleDeleteNotification(item._id)}
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}

          <Pagination
            pagination={pagination}
            onPageChange={(page) => fetchNotifications(page)}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
