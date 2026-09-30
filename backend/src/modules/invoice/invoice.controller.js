const invoiceService = require('./invoice.service');
const { AppError } = require('../auth/auth.service');

/**
 * Invoice Controller
 *
 * Handles HTTP requests for invoice issuance, customer billing views,
 * booking billing histories, and administrative cancellations.
 * Coordinates with InvoiceService without direct MongoDB access.
 */
class InvoiceController {
  /**
   * POST /api/invoices/generate
   * Generate permanent billing invoice from successful payment (Customer / Admin / System)
   */
  async generateInvoice(req, res) {
    try {
      const authUser = req.user;
      const invoice = await invoiceService.generateInvoice(req.body, authUser);

      return res.status(201).json({
        success: true,
        message: 'Invoice generated successfully',
        data: invoice,
      });
    } catch (error) {
      return InvoiceController.handleError(res, error);
    }
  }

  /**
   * GET /api/invoices
   * List invoice billing history (Customer scoped to own, Admin can filter all)
   */
  async getInvoicesList(req, res) {
    try {
      const authUser = req.user;
      const result = await invoiceService.getInvoicesList({ query: req.query }, authUser);

      return res.status(200).json({
        success: true,
        message: 'Invoices fetched successfully',
        data: result.invoices,
        pagination: result.pagination,
      });
    } catch (error) {
      return InvoiceController.handleError(res, error);
    }
  }

  /**
   * GET /api/invoices/:invoiceId
   * Retrieve single invoice by ID (Customer owner or Admin)
   */
  async getInvoiceById(req, res) {
    try {
      const authUser = req.user;
      const { invoiceId } = req.params;
      const invoice = await invoiceService.getInvoiceById(invoiceId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Invoice details fetched successfully',
        data: invoice,
      });
    } catch (error) {
      return InvoiceController.handleError(res, error);
    }
  }

  /**
   * GET /api/invoices/booking/:bookingId
   * Retrieve invoice history for a booking (Customer owner or Admin)
   */
  async getInvoicesByBookingId(req, res) {
    try {
      const authUser = req.user;
      const { bookingId } = req.params;
      const invoices = await invoiceService.getInvoicesByBookingId(bookingId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Booking invoices fetched successfully',
        data: invoices,
      });
    } catch (error) {
      return InvoiceController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/invoices/:invoiceId/cancel
   * Cancel issued invoice (Admin only)
   */
  async cancelInvoice(req, res) {
    try {
      const authUser = req.user;
      const { invoiceId } = req.params;
      const invoice = await invoiceService.cancelInvoice(invoiceId, req.body, authUser);

      return res.status(200).json({
        success: true,
        message: 'Invoice cancelled successfully',
        data: invoice,
      });
    } catch (error) {
      return InvoiceController.handleError(res, error);
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

    console.error('[InvoiceController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new InvoiceController();
