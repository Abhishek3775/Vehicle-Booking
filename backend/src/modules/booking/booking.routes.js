const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const {
  validateCreateBooking,
  validateCancelBooking,
} = require('./booking.validation');

/**
 * @route   POST /api/bookings
 * @desc    Create a new vehicle service or emergency booking
 * @access  Private (Authenticated customer)
 */
router.post(
  '/',
  authenticate,
  validateCreateBooking,
  (req, res) => bookingController.createBooking(req, res)
);

/**
 * @route   GET /api/bookings
 * @desc    Retrieve all bookings belonging to the authenticated customer
 * @access  Private (Authenticated customer)
 */
router.get(
  '/',
  authenticate,
  (req, res) => bookingController.getUserBookings(req, res)
);

/**
 * @route   GET /api/bookings/:bookingId
 * @desc    Retrieve details of a single booking belonging to the customer
 * @access  Private (Authenticated customer)
 */
router.get(
  '/:bookingId',
  authenticate,
  (req, res) => bookingController.getBookingById(req, res)
);

/**
 * @route   PATCH /api/bookings/:bookingId/cancel
 * @desc    Cancel an eligible booking (e.g. in PENDING, ASSIGNED, ACCEPTED state)
 * @access  Private (Authenticated customer)
 */
router.patch(
  '/:bookingId/cancel',
  authenticate,
  validateCancelBooking,
  (req, res) => bookingController.cancelBooking(req, res)
);

module.exports = router;
