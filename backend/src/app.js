const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const vehicleRoutes = require('./modules/vehicle/vehicle.routes');
const addressRoutes = require('./modules/address/address.routes');
const serviceRoutes = require('./modules/service/service.routes');

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

// Service Catalogue Module Routes
app.use('/api/services', serviceRoutes);

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
