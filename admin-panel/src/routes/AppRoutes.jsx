import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import AdminLayout from '../components/layout/AdminLayout';
import { PageLoader } from '../components/common/LoadingStates';

// Lazy loaded pages for performance
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const UnauthorizedPage = lazy(() => import('../pages/auth/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/common/CommonPages').then(m => ({ default: m.NotFoundPage })));
const ComingSoonPage = lazy(() => import('../pages/common/CommonPages').then(m => ({ default: m.ComingSoonPage })));

const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const UsersListPage = lazy(() => import('../pages/users/UsersListPage'));
const UserDetailsPage = lazy(() => import('../pages/users/UserDetailsPage'));
const MechanicsListPage = lazy(() => import('../pages/mechanics/MechanicsListPage'));
const MechanicDetailsPage = lazy(() => import('../pages/mechanics/MechanicDetailsPage'));
const BookingsListPage = lazy(() => import('../pages/bookings/BookingsListPage'));
const BookingDetailsPage = lazy(() => import('../pages/bookings/BookingDetailsPage'));
const DispatchListPage = lazy(() => import('../pages/dispatch/DispatchListPage'));
const ServicesListPage = lazy(() => import('../pages/services/ServicesListPage'));
const PackagesListPage = lazy(() => import('../pages/packages/PackagesListPage'));
const InventoryListPage = lazy(() => import('../pages/inventory/InventoryListPage'));
const PaymentsListPage = lazy(() => import('../pages/payments/PaymentsListPage'));
const PaymentDetailsPage = lazy(() => import('../pages/payments/PaymentDetailsPage'));
const InvoicesListPage = lazy(() => import('../pages/invoices/InvoicesListPage'));
const InvoiceDetailsPage = lazy(() => import('../pages/invoices/InvoiceDetailsPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const AuditLogsPage = lazy(() => import('../pages/audit/AuditLogsPage'));
const AdminProfilePage = lazy(() => import('../pages/profile/AdminProfilePage'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader text="Loading interface..." />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Admin Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Users */}
          <Route path="/users" element={<UsersListPage />} />
          <Route path="/users/:userId" element={<UserDetailsPage />} />

          {/* Mechanics */}
          <Route path="/mechanics" element={<MechanicsListPage />} />
          <Route path="/mechanics/:mechanicId" element={<MechanicDetailsPage />} />

          {/* Bookings */}
          <Route path="/bookings" element={<BookingsListPage />} />
          <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} />

          {/* Dispatch */}
          <Route path="/dispatch" element={<DispatchListPage />} />

          {/* Services & Packages */}
          <Route path="/services" element={<ServicesListPage />} />
          <Route path="/service-packages" element={<PackagesListPage />} />

          {/* Inventory */}
          <Route path="/inventory" element={<InventoryListPage />} />

          {/* Payments & Invoices */}
          <Route path="/payments" element={<PaymentsListPage />} />
          <Route path="/payments/:paymentId" element={<PaymentDetailsPage />} />
          <Route path="/invoices" element={<InvoicesListPage />} />
          <Route path="/invoices/:invoiceId" element={<InvoiceDetailsPage />} />

          {/* Notifications, Audit & Profile */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/profile" element={<AdminProfilePage />} />

          {/* Planned / Future Modules (README defined) */}
          <Route
            path="/reviews"
            element={
              <ComingSoonPage
                moduleName="Customer & Mechanic Reviews"
                description="The Reviews & Ratings API is scheduled for the next backend release milestone."
              />
            }
          />
          <Route
            path="/support"
            element={
              <ComingSoonPage
                moduleName="Support & Helpdesk Ticketing"
                description="Customer support helpdesk ticketing APIs will be connected as soon as backend integration is complete."
              />
            }
          />
          <Route
            path="/coupons"
            element={
              <ComingSoonPage
                moduleName="Promo Codes & Discounts"
                description="Promotional discount rules and voucher validation system is currently marked as planned."
              />
            }
          />
        </Route>

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
