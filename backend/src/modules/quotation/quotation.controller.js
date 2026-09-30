const quotationService = require('./quotation.service');
const { AppError } = require('../auth/auth.service');

/**
 * Quotation Controller
 *
 * Handles HTTP requests for quotation creation, submission, customer approval,
 * and rejection workflows.
 * Extracts user context and coordinates with QuotationService.
 * Contains zero direct database queries.
 */
class QuotationController {
  /**
   * POST /api/quotations
   * Create a new quotation for a completed inspection (Assigned mechanic or Admin)
   */
  async createQuotation(req, res) {
    try {
      const authUser = req.user;
      const quotation = await quotationService.createQuotation(req.body, authUser);

      return res.status(201).json({
        success: true,
        message: 'Quotation created successfully',
        data: quotation,
      });
    } catch (error) {
      return QuotationController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/quotations/:quotationId/submit
   * Submit quotation for customer approval (Assigned mechanic or Admin)
   */
  async submitQuotation(req, res) {
    try {
      const authUser = req.user;
      const { quotationId } = req.params;
      const quotation = await quotationService.submitQuotation(quotationId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Quotation submitted for customer approval successfully',
        data: quotation,
      });
    } catch (error) {
      return QuotationController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/quotations/:quotationId/approve
   * Customer approves quotation (Customer only)
   */
  async approveQuotation(req, res) {
    try {
      const authUser = req.user;
      const { quotationId } = req.params;
      const quotation = await quotationService.approveQuotation(quotationId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Quotation approved successfully',
        data: quotation,
      });
    } catch (error) {
      return QuotationController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/quotations/:quotationId/reject
   * Customer rejects quotation with reason (Customer only)
   */
  async rejectQuotation(req, res) {
    try {
      const authUser = req.user;
      const { quotationId } = req.params;
      const { reason } = req.body;
      const quotation = await quotationService.rejectQuotation(quotationId, { reason }, authUser);

      return res.status(200).json({
        success: true,
        message: 'Quotation rejected successfully',
        data: quotation,
      });
    } catch (error) {
      return QuotationController.handleError(res, error);
    }
  }

  /**
   * GET /api/quotations/:quotationId
   * Retrieve single quotation details by ID
   */
  async getQuotationById(req, res) {
    try {
      const authUser = req.user;
      const { quotationId } = req.params;
      const quotation = await quotationService.getQuotationById(quotationId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Quotation details fetched successfully',
        data: quotation,
      });
    } catch (error) {
      return QuotationController.handleError(res, error);
    }
  }

  /**
   * GET /api/quotations/booking/:bookingId
   * Retrieve all quotations associated with a booking
   */
  async getQuotationsByBookingId(req, res) {
    try {
      const authUser = req.user;
      const { bookingId } = req.params;
      const quotations = await quotationService.getQuotationsByBookingId(bookingId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Booking quotations fetched successfully',
        data: quotations,
      });
    } catch (error) {
      return QuotationController.handleError(res, error);
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

    console.error('[QuotationController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new QuotationController();
