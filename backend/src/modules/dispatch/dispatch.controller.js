const { dispatchService, AppError } = require('./dispatch.service');

/**
 * Dispatch Controller
 *
 * Handles HTTP requests for mechanic assignment and dispatch management.
 * Coordinates authorization contexts and delegates to DispatchService.
 * Contains zero direct database queries or business rules.
 */
class DispatchController {
  /**
   * POST /api/dispatch/:bookingId
   * Initiate dispatch process for a booking (Admin only)
   */
  async createDispatch(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { bookingId } = req.params;
      const dispatch = await dispatchService.createDispatch(
        bookingId,
        adminUserId,
        req.body
      );

      return res.status(201).json({
        success: true,
        message: 'Dispatch initiated successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
    }
  }

  /**
   * POST /api/dispatch/:bookingId/assign
   * Manually assign mechanic to a booking (Admin only)
   */
  async manualAssign(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { bookingId } = req.params;
      const { mechanicId, notes } = req.body;

      const dispatch = await dispatchService.manualAssignMechanic(
        bookingId,
        mechanicId,
        adminUserId,
        { notes }
      );

      return res.status(200).json({
        success: true,
        message: 'Mechanic assigned successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
    }
  }

  /**
   * POST /api/dispatch/:bookingId/auto-assign
   * Automatically find and assign the best available mechanic (Admin only)
   */
  async autoAssign(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { bookingId } = req.params;

      const dispatch = await dispatchService.autoAssignMechanic(
        bookingId,
        adminUserId
      );

      return res.status(200).json({
        success: true,
        message: 'Mechanic auto-assigned successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/dispatch/:dispatchId/accept
   * Mechanic accepts their assigned dispatch (Mechanic only)
   */
  async acceptAssignment(req, res) {
    try {
      const mechanicUserId = req.user?.userId || req.user?.id;
      const { dispatchId } = req.params;

      const dispatch = await dispatchService.acceptAssignment(
        dispatchId,
        mechanicUserId
      );

      return res.status(200).json({
        success: true,
        message: 'Dispatch assignment accepted successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/dispatch/:dispatchId/reject
   * Mechanic rejects their assigned dispatch with a reason (Mechanic only)
   */
  async rejectAssignment(req, res) {
    try {
      const mechanicUserId = req.user?.userId || req.user?.id;
      const { dispatchId } = req.params;
      const { rejectionReason } = req.body;

      const dispatch = await dispatchService.rejectAssignment(
        dispatchId,
        mechanicUserId,
        rejectionReason
      );

      return res.status(200).json({
        success: true,
        message: 'Dispatch assignment rejected successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
    }
  }

  /**
   * GET /api/dispatch/:dispatchId
   * Retrieve dispatch details (Multi-role access)
   */
  async getDispatchById(req, res) {
    try {
      const { dispatchId } = req.params;
      const userContext = {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
      };

      const dispatch = await dispatchService.getDispatchById(
        dispatchId,
        userContext
      );

      return res.status(200).json({
        success: true,
        message: 'Dispatch details fetched successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
    }
  }

  /**
   * GET /api/dispatch/booking/:bookingId
   * Retrieve dispatch details for a specific booking (Customer/Admin access)
   */
  async getDispatchByBookingId(req, res) {
    try {
      const { bookingId } = req.params;
      const userContext = {
        userId: req.user?.userId || req.user?.id,
        role: req.user?.role,
      };

      const dispatch = await dispatchService.getDispatchByBookingId(
        bookingId,
        userContext
      );

      return res.status(200).json({
        success: true,
        message: 'Booking dispatch details fetched successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/dispatch/:dispatchId/cancel
   * Cancel dispatch process (Admin only)
   */
  async cancelDispatch(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { dispatchId } = req.params;
      const { cancellationReason } = req.body;

      const dispatch = await dispatchService.cancelDispatch(
        dispatchId,
        adminUserId,
        cancellationReason
      );

      return res.status(200).json({
        success: true,
        message: 'Dispatch cancelled successfully',
        data: dispatch,
      });
    } catch (error) {
      return DispatchController.handleError(res, error);
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

    console.error('[DispatchController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new DispatchController();
