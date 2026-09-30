const { bookingService, AppError } = require('./booking.service');

/**
 * Booking Controller
 *
 * Handles HTTP requests for customer vehicle service bookings.
 * Extracts authenticated user context and coordinates with BookingService.
 * Contains zero direct database queries or business logic.
 */
class BookingController {
  /**
   * POST /api/bookings
   * Create a new booking (Authenticated customer only)
   */
  async createBooking(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const booking = await bookingService.createBooking(userId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking,
      });
    } catch (error) {
      return BookingController.handleError(res, error);
    }
  }

  /**
   * GET /api/bookings
   * Retrieve list of bookings belonging to the authenticated customer
   */
  async getUserBookings(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const result = await bookingService.getUserBookings({
        userId,
        query: req.query,
      });

      return res.status(200).json({
        success: true,
        message: 'Bookings fetched successfully',
        data: result.bookings,
        pagination: result.pagination,
      });
    } catch (error) {
      return BookingController.handleError(res, error);
    }
  }

  /**
   * GET /api/bookings/:bookingId
   * Retrieve single booking details belonging to the authenticated customer
   */
  async getBookingById(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { bookingId } = req.params;
      const booking = await bookingService.getBookingById(bookingId, userId);

      return res.status(200).json({
        success: true,
        message: 'Booking details fetched successfully',
        data: booking,
      });
    } catch (error) {
      return BookingController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/bookings/:bookingId/cancel
   * Cancel an eligible booking (Authenticated customer owner only)
   */
  async cancelBooking(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { bookingId } = req.params;
      const { cancellationReason } = req.body;

      const cancelledBooking = await bookingService.cancelBooking(
        bookingId,
        userId,
        cancellationReason
      );

      return res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully',
        data: cancelledBooking,
      });
    } catch (error) {
      return BookingController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error response formatter
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    console.error('[BookingController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new BookingController();
