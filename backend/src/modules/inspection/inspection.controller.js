const inspectionService = require('./inspection.service');
const { AppError } = require('../auth/auth.service');

/**
 * Inspection Controller
 *
 * Handles HTTP requests for vehicle inspection workflows.
 * Extracts user context and coordinates with InspectionService.
 * Contains zero direct database queries.
 */
class InspectionController {
  /**
   * POST /api/inspections/:bookingId/start
   * Start a new vehicle inspection for a booking (Assigned mechanic or Admin)
   */
  async startInspection(req, res) {
    try {
      const authUser = req.user;
      const { bookingId } = req.params;
      const inspection = await inspectionService.startInspection(bookingId, authUser, req.body);

      return res.status(201).json({
        success: true,
        message: 'Vehicle inspection started successfully',
        data: inspection,
      });
    } catch (error) {
      return InspectionController.handleError(res, error);
    }
  }

  /**
   * PUT /api/inspections/:inspectionId
   * Update active inspection checklist, findings, and recommendations (Assigned mechanic or Admin)
   */
  async updateInspection(req, res) {
    try {
      const authUser = req.user;
      const { inspectionId } = req.params;
      const inspection = await inspectionService.updateInspection(inspectionId, req.body, authUser);

      return res.status(200).json({
        success: true,
        message: 'Inspection details updated successfully',
        data: inspection,
      });
    } catch (error) {
      return InspectionController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/inspections/:inspectionId/complete
   * Mark inspection as complete and ready for quotation (Assigned mechanic or Admin)
   */
  async completeInspection(req, res) {
    try {
      const authUser = req.user;
      const { inspectionId } = req.params;
      const inspection = await inspectionService.completeInspection(inspectionId, authUser, req.body);

      return res.status(200).json({
        success: true,
        message: 'Inspection completed successfully',
        data: inspection,
      });
    } catch (error) {
      return InspectionController.handleError(res, error);
    }
  }

  /**
   * GET /api/inspections/:inspectionId
   * Retrieve single inspection report details (Customer owner, Assigned mechanic, or Admin)
   */
  async getInspectionById(req, res) {
    try {
      const authUser = req.user;
      const { inspectionId } = req.params;
      const inspection = await inspectionService.getInspectionById(inspectionId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Inspection details fetched successfully',
        data: inspection,
      });
    } catch (error) {
      return InspectionController.handleError(res, error);
    }
  }

  /**
   * GET /api/inspections/booking/:bookingId
   * Retrieve latest inspection report for a specific booking (Customer owner, Assigned mechanic, or Admin)
   */
  async getInspectionByBookingId(req, res) {
    try {
      const authUser = req.user;
      const { bookingId } = req.params;
      const inspection = await inspectionService.getInspectionByBookingId(bookingId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Booking inspection fetched successfully',
        data: inspection,
      });
    } catch (error) {
      return InspectionController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/inspections/:inspectionId/acknowledge
   * Customer acknowledges viewing completed inspection findings (Customer only)
   */
  async acknowledgeInspection(req, res) {
    try {
      const authUser = req.user;
      const { inspectionId } = req.params;
      const inspection = await inspectionService.acknowledgeInspection(inspectionId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Inspection findings acknowledged successfully',
        data: inspection,
      });
    } catch (error) {
      return InspectionController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error response handler
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    console.error('[InspectionController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new InspectionController();
