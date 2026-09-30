const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const vehicleRoutes = require('./modules/vehicle/vehicle.routes');
const addressRoutes = require('./modules/address/address.routes');
const locationRoutes = require('./modules/location/location.routes');
const serviceRoutes = require('./modules/service/service.routes');
const servicePackageRoutes = require('./modules/service-package/servicePackage.routes');
const partsRoutes = require('./modules/parts/parts.routes');
const bookingRoutes = require('./modules/booking/booking.routes');
const dispatchRoutes = require('./modules/dispatch/dispatch.routes');
const mechanicRoutes = require('./modules/mechanic/mechanic.routes');
const inspectionRoutes = require('./modules/inspection/inspection.routes');
const quotationRoutes = require('./modules/quotation/quotation.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const invoiceRoutes = require('./modules/invoice/invoice.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vehicle Booking API server is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Authentication Module Routes
app.use('/api/auth', authRoutes);

// User Profile Module Routes
app.use('/api/users', userRoutes);

// Vehicle Module Routes
app.use('/api/vehicles', vehicleRoutes);

// Address Module Routes
app.use('/api/addresses', addressRoutes);

// Location Module Routes
app.use('/api/locations', locationRoutes);

// Service Catalogue Module Routes
app.use('/api/services', serviceRoutes);

// Service Package Module Routes
app.use('/api/service-packages', servicePackageRoutes);

// Parts / Inventory Module Routes
app.use('/api/parts', partsRoutes);

// Booking Module Routes
app.use('/api/bookings', bookingRoutes);

// Dispatch Module Routes
app.use('/api/dispatch', dispatchRoutes);

// Mechanic Module Routes
app.use('/api/mechanics', mechanicRoutes);

// Inspection Module Routes
app.use('/api/inspections', inspectionRoutes);

// Quotation Module Routes
app.use('/api/quotations', quotationRoutes);

// Payment Module Routes
app.use('/api/payments', paymentRoutes);

// Invoice Module Routes
app.use('/api/invoices', invoiceRoutes);

// Notification Module Routes
app.use('/api/notifications', notificationRoutes);

// Admin Module Routes
app.use('/api/admin', adminRoutes);

// Catch-all 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    error: {},
  });
});

// Global Centralized Error Handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err);

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? { stack: err.stack } : {},
  });
});

module.exports = app;
