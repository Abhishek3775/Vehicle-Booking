import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers,
  FiTruck,
  FiCalendar,
  FiDollarSign,
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { adminApi } from '../../services/admin.api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingStates';
import { ErrorState } from '../../components/common/FeedbackStates';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard Data State
  const [summary, setSummary] = useState(null);
  const [bookingTrends, setBookingTrends] = useState([]);
  const [revenueStats, setRevenueStats] = useState(null);
  const [mechanicStats, setMechanicStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, trendsRes, revenueRes, mechanicsRes, bookingsRes] =
        await Promise.allSettled([
          adminApi.getDashboardSummary(),
          adminApi.getBookingAnalytics(),
          adminApi.getRevenueAnalytics(),
          adminApi.getMechanicsAnalytics(),
          adminApi.getBookings({ limit: 5 }),
        ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.success) {
        setSummary(summaryRes.value.data);
      }
      if (trendsRes.status === 'fulfilled' && trendsRes.value.success) {
        setBookingTrends(trendsRes.value.data || []);
      }
      if (revenueRes.status === 'fulfilled' && revenueRes.value.success) {
        setRevenueStats(revenueRes.value.data);
      }
      if (mechanicsRes.status === 'fulfilled' && mechanicsRes.value.success) {
        setMechanicStats(mechanicsRes.value.data);
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.success) {
        setRecentBookings(bookingsRes.value.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to aggregate dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !summary) {
    return <PageLoader message="Aggregating platform telemetry & analytics..." />;
  }

  if (error && !summary) {
    return <ErrorState title="Dashboard Unavailable" message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Platform Operations Dashboard</h1>
          <p className="page-header-subtitle">
            Real-time telemetry, fleet availability, service bookings, and financial analytics.
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={fetchDashboardData} className="btn btn-secondary btn-sm" title="Refresh metrics">
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '1.75rem' }}>
        <StatCard
          icon={FiUsers}
          title="Total Customers"
          value={summary?.users?.total ?? 0}
          subtext={`${summary?.users?.active ?? 0} active accounts`}
          color="blue"
        />

        <StatCard
          icon={FiTruck}
          title="Mechanic Fleet"
          value={summary?.mechanics?.total ?? 0}
          subtext={`${summary?.mechanics?.available ?? 0} available on duty`}
          color="green"
        />

        <StatCard
          icon={FiCalendar}
          title="Total Bookings"
          value={summary?.bookings?.total ?? 0}
          subtext={`${summary?.bookings?.active ?? 0} currently active`}
          color="amber"
        />

        <StatCard
          icon={FiDollarSign}
          title="Settled Revenue"
          value={formatCurrency(summary?.revenue?.total ?? revenueStats?.totalRevenue ?? 0)}
          subtext={`${summary?.payments?.successful ?? revenueStats?.transactionCount ?? 0} paid transactions`}
          color="purple"
        />
      </div>

      {/* Analytics & Fleet Status Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1.5rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Booking Volume Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Booking Volume Trends</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Daily service and emergency roadside assistance bookings
              </p>
            </div>
            <Link to="/bookings" className="btn btn-secondary btn-sm">
              View All <FiArrowRight size={14} />
            </Link>
          </div>

          <div style={{ height: '260px', width: '100%', marginTop: '0.5rem' }}>
            {bookingTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookingTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Requests"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                No historical booking trend data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Mechanic Fleet Availability Summary */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Mechanic Fleet State</div>
            <Link to="/mechanics" className="btn btn-secondary btn-sm">
              Manage
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Available (Idle)</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {mechanicStats?.available ?? summary?.mechanics?.available ?? 0}
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--success)',
                    width: `${Math.min(
                      (((mechanicStats?.available || 0) / (mechanicStats?.total || 1)) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>On Active Job</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {mechanicStats?.onJob ?? summary?.mechanics?.onJob ?? 0}
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--primary)',
                    width: `${Math.min(
                      (((mechanicStats?.onJob || 0) / (mechanicStats?.total || 1)) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Pending Verification</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
                  {mechanicStats?.pendingVerification ?? 0}
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--warning)',
                    width: `${Math.min(
                      (((mechanicStats?.pendingVerification || 0) / (mechanicStats?.total || 1)) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Offline / Break</span>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                  {mechanicStats?.unavailable ?? 0}
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#94a3b8',
                    width: `${Math.min(
                      (((mechanicStats?.unavailable || 0) / (mechanicStats?.total || 1)) * 100),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Quick Tables */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Service Bookings</div>
          <Link to="/bookings" className="btn btn-secondary btn-sm">
            View All Bookings <FiArrowRight size={14} />
          </Link>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Type</th>
                <th>Status</th>
                <th>Scheduled At</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No bookings recorded in the system yet.
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.id || b._id}>
                    <td>
                      <Link to={`/bookings/${b.id || b._id}`} style={{ fontWeight: 600 }}>
                        {b.bookingReference}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={b.bookingType} />
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td>{formatDateTime(b.scheduledAt)}</td>
                    <td>{formatDateTime(b.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/bookings/${b.id || b._id}`} className="btn btn-secondary btn-sm">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
