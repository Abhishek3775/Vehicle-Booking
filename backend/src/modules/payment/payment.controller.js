const paymentService = require('./payment.service');
const { AppError } = require('../auth/auth.service');

/**
 * Payment Controller
 *
 * Handles HTTP requests for payment order creation, gateway verification,
 * webhooks, and payment history queries.
 * Coordinates with PaymentService without direct MongoDB access.
 */
class PaymentController {
  /**
   * POST /api/payments/create-order
   * Create payment order for approved quotation (Authenticated Customer)
   */
  async createOrder(req, res) {
    try {
      const authUser = req.user;
      const payment = await paymentService.createOrder(req.body, authUser);

      return res.status(201).json({
        success: true,
        message: 'Payment order created successfully',
        data: payment,
      });
    } catch (error) {
      return PaymentController.handleError(res, error);
    }
  }

  /**
   * POST /api/payments/verify
   * Verify Razorpay cryptographic signature (Authenticated Customer)
   */
  async verifyPayment(req, res) {
    try {
      const authUser = req.user;
      const payment = await paymentService.verifyPayment(req.body, authUser);

      return res.status(200).json({
        success: true,
        message: 'Payment verified and settled successfully',
        data: payment,
      });
    } catch (error) {
      return PaymentController.handleError(res, error);
    }
  }

  /**
   * POST /api/payments/webhook/razorpay
   * Handle incoming Razorpay asynchronous events
   */
  async handleRazorpayWebhook(req, res) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = req.rawBody || req.body;
      const result = await paymentService.handleRazorpayWebhook(req.body, signature, rawBody);

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: result,
      });
    } catch (error) {
      return PaymentController.handleError(res, error);
    }
  }

  /**
   * GET /api/payments/:paymentId
   * Retrieve payment details by ID (Customer owner or Admin)
   */
  async getPaymentById(req, res) {
    try {
      const authUser = req.user;
      const { paymentId } = req.params;
      const payment = await paymentService.getPaymentById(paymentId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Payment details fetched successfully',
        data: payment,
      });
    } catch (error) {
      return PaymentController.handleError(res, error);
    }
  }

  /**
   * GET /api/payments/booking/:bookingId
   * Retrieve all payments associated with a booking (Customer owner or Admin)
   */
  async getPaymentsByBookingId(req, res) {
    try {
      const authUser = req.user;
      const { bookingId } = req.params;
      const payments = await paymentService.getPaymentsByBookingId(bookingId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Booking payment history fetched successfully',
        data: payments,
      });
    } catch (error) {
      return PaymentController.handleError(res, error);
    }
  }

  /**
   * GET /api/payments/quotation/:quotationId
   * Retrieve all payments associated with a quotation (Customer owner or Admin)
   */
  async getPaymentsByQuotationId(req, res) {
    try {
      const authUser = req.user;
      const { quotationId } = req.params;
      const payments = await paymentService.getPaymentsByQuotationId(quotationId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Quotation payment history fetched successfully',
        data: payments,
      });
    } catch (error) {
      return PaymentController.handleError(res, error);
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

    console.error('[PaymentController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new PaymentController();
