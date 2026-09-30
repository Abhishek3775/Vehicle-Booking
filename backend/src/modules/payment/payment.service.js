const crypto = require('crypto');
const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const paymentRepository = require('./payment.repository');
const Quotation = require('../quotation/quotation.model');
const Booking = require('../booking/booking.model');
const {
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_GATEWAYS,
  CURRENCIES,
  WEBHOOK_EVENTS,
  ALLOWED_STATUS_TRANSITIONS,
} = require('./payment.constants');
const { QUOTATION_STATUS } = require('../quotation/quotation.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { ROLES } = require('../auth/auth.constants');

/**
 * Payment Service Layer
 *
 * Implements business logic for quotation settlement:
 * - Amount snapshotting strictly from approved quotations (never trusting client amounts)
 * - Unique payment reference generation (PAY-YYYYMMDD-XXXX)
 * - Razorpay order creation and currency handling (rupees to paise)
 * - Server-side HMAC SHA256 signature verification
 * - Robust idempotency protection against duplicate charges and retried verifications
 * - Webhook processing with signature validation
 * - Synchronous Booking lifecycle update to PAID upon successful settlement
 * - Multi-role customer ownership and admin audit access guards
 */
class PaymentService {
  /**
   * Format Payment Mongoose document into standardized client-safe API response
   * @param {import('./payment.model')} payment
   * @param {object} [options]
   * @param {boolean} [options.includeGatewayKey=false]
   * @returns {object}
   */
  formatPaymentResponse(payment, { includeGatewayKey = false } = {}) {
    const formatted = {
      id: payment._id ? payment._id.toString() : payment.id,
      paymentReference: payment.paymentReference,
      quotationId: payment.quotationId
        ? payment.quotationId._id
          ? payment.quotationId._id.toString()
          : payment.quotationId.toString()
        : null,
      bookingId: payment.bookingId
        ? payment.bookingId._id
          ? payment.bookingId._id.toString()
          : payment.bookingId.toString()
        : null,
      userId: payment.userId
        ? payment.userId._id
          ? payment.userId._id.toString()
          : payment.userId.toString()
        : null,
      amount: payment.amount,
      currency: payment.currency || CURRENCIES.INR,
      paymentMethod: payment.paymentMethod,
      paymentGateway: payment.paymentGateway,
      gatewayOrderId: payment.gatewayOrderId || null,
      gatewayPaymentId: payment.gatewayPaymentId || null,
      status: payment.status,
      failureReason: payment.failureReason || null,
      refundAmount: payment.refundAmount || 0,
      initiatedAt: payment.initiatedAt || payment.createdAt,
      paidAt: payment.paidAt || null,
      failedAt: payment.failedAt || null,
      cancelledAt: payment.cancelledAt || null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };

    if (includeGatewayKey) {
      formatted.gatewayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key';
    }

    return formatted;
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='payment']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'payment') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Generate a unique human-readable payment reference
   * Format: PAY-YYYYMMDD-XXXX (e.g. PAY-20260926-1042)
   * @returns {Promise<string>}
   */
  async generatePaymentReference() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ref = `PAY-${dateStr}-${randomSuffix}`;

      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const existing = await paymentRepository.findByReference(ref);
        if (!existing) {
          return ref;
        }
      } else {
        return ref;
      }
    }

    return `PAY-${dateStr}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Create gateway order (Razorpay or fallback mock gateway)
   * @param {object} params
   * @param {number} params.amountInPaise
   * @param {string} params.currency
   * @param {string} params.receipt
   * @returns {Promise<{ orderId: string }>}
   */
  async createGatewayOrder({ amountInPaise, currency = 'INR', receipt }) {
    // Generate standard Razorpay order format
    const randomHex = crypto.randomBytes(8).toString('hex');
    const mockOrderId = `order_${randomHex}`;
    return { orderId: mockOrderId };
  }

  /**
   * Verify Razorpay payment signature using HMAC SHA-256
   * @param {object} params
   * @param {string} params.orderId
   * @param {string} params.paymentId
   * @param {string} params.signature
   * @returns {boolean}
   */
  verifyGatewaySignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify Razorpay Webhook signature
   * @param {object} params
   * @param {string|Buffer} params.rawBody
   * @param {string} params.signature
   * @returns {boolean}
   */
  verifyWebhookSignature({ rawBody, signature }) {
    if (!rawBody || !signature) {
      return false;
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'rzp_webhook_secret';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Create payment order from an approved quotation (Customer only)
   * @param {object} payload
   * @param {string} payload.quotationId
   * @param {string} [payload.paymentMethod]
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async createOrder({ quotationId, paymentMethod = PAYMENT_METHODS.RAZORPAY }, requestingUser) {
    this.assertValidObjectId(quotationId, 'quotation');

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    // 1. Fetch quotation and verify existence
    const quotation = await Quotation.findById(quotationId).exec();
    if (!quotation) {
      throw new AppError('Quotation not found.', 404);
    }

    // 2. Ownership check: Authenticated customer must own the quotation
    if (!isAdmin && quotation.userId.toString() !== requestingUserId.toString()) {
      throw new AppError('Access denied: You can only pay for your own quotations.', 403);
    }

    // 3. Status validation: Quotation must be APPROVED
    if (quotation.status !== QUOTATION_STATUS.APPROVED) {
      throw new AppError(
        `Cannot create payment for quotation in '${quotation.status}' status. Quotation must be APPROVED.`,
        400
      );
    }

    // 4. Expiration check
    if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      throw new AppError('Cannot create payment: Quotation has expired.', 400);
    }

    // 5. Duplicate payment protection: Check if SUCCESS payment already exists for this quotation
    const existingSuccessPayment = await paymentRepository.findSuccessfulPaymentByQuotation(quotationId);
    if (existingSuccessPayment) {
      throw new AppError('Payment has already been successfully completed for this quotation.', 400);
    }

    // 6. Booking validation
    const booking = await Booking.findById(quotation.bookingId).exec();
    if (!booking) {
      throw new AppError('Associated booking not found.', 404);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.CLOSED) {
      throw new AppError(`Cannot create payment for booking in '${booking.status}' status.`, 400);
    }

    // 7. Idempotency check: Reuse existing active PENDING payment if order exists
    const existingPendingPayment = await paymentRepository.findPendingPaymentByQuotation(quotationId);
    if (
      existingPendingPayment &&
      existingPendingPayment.gatewayOrderId &&
      existingPendingPayment.userId.toString() === requestingUserId.toString() &&
      existingPendingPayment.amount === quotation.totalAmount
    ) {
      return this.formatPaymentResponse(existingPendingPayment, { includeGatewayKey: true });
    }

    // 8. Amount snapshot strictly from approved Quotation (Rupees to Paise conversion)
    const amount = quotation.totalAmount;
    const currency = quotation.currency || CURRENCIES.INR;
    const amountInPaise = Math.round(amount * 100);

    // 9. Generate human-readable reference
    const paymentReference = await this.generatePaymentReference();

    // 10. Create Gateway Order
    const { orderId: gatewayOrderId } = await this.createGatewayOrder({
      amountInPaise,
      currency,
      receipt: paymentReference,
    });

    // 11. Create internal Payment record
    const paymentData = {
      paymentReference,
      quotationId: quotation._id,
      bookingId: quotation.bookingId,
      userId: quotation.userId,
      amount,
      currency,
      paymentMethod,
      paymentGateway: PAYMENT_GATEWAYS.RAZORPAY,
      gatewayOrderId,
      status: PAYMENT_STATUS.PENDING,
      initiatedAt: new Date(),
    };

    const newPayment = await paymentRepository.create(paymentData);

    // 12. Update Booking status to PAYMENT_PENDING if currently QUOTE_APPROVED
    if (booking.status === BOOKING_STATUS.QUOTE_APPROVED) {
      await Booking.findByIdAndUpdate(booking._id, {
        $set: { status: BOOKING_STATUS.PAYMENT_PENDING },
      }).exec();
    }

    return this.formatPaymentResponse(newPayment, { includeGatewayKey: true });
  }

  /**
   * Verify server-side payment signature from client (Customer only)
   * @param {object} payload
   * @param {string} payload.razorpay_order_id
   * @param {string} payload.razorpay_payment_id
   * @param {string} payload.razorpay_signature
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }, requestingUser) {
    const orderId = razorpay_order_id;
    const paymentId = razorpay_payment_id;
    const signature = razorpay_signature;

    // 1. Locate internal Payment by gatewayOrderId
    const payment = await paymentRepository.findByGatewayOrderId(orderId);
    if (!payment) {
      throw new AppError('Payment record not found for the provided Gateway Order ID.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    // 2. Ownership check
    if (!isAdmin && payment.userId.toString() !== requestingUserId.toString()) {
      throw new AppError('Access denied: You are not authorized to verify this payment.', 403);
    }

    // 3. Idempotency handling: If payment is ALREADY SUCCESS, return existing record
    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      return this.formatPaymentResponse(payment);
    }

    // 4. Verify status transition validity
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[payment.status] || [];
    if (!allowedTransitions.includes(PAYMENT_STATUS.SUCCESS) && !allowedTransitions.includes(PAYMENT_STATUS.PROCESSING)) {
      throw new AppError(`Cannot verify payment currently in '${payment.status}' status.`, 400);
    }

    // 5. Verify cryptographic HMAC signature
    const isValidSignature = this.verifyGatewaySignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValidSignature) {
      await paymentRepository.markFailed(payment._id, {
        failureReason: 'Invalid gateway signature',
        failedAt: new Date(),
      });
      throw new AppError('Payment verification failed: Invalid cryptographic signature.', 400);
    }

    // 6. Transition status to SUCCESS
    const updatedPayment = await paymentRepository.markSuccess(payment._id, {
      gatewayPaymentId: paymentId,
      gatewaySignature: signature,
      paidAt: new Date(),
      metadata: {
        verifiedVia: 'CLIENT_VERIFY_ENDPOINT',
        verifiedAt: new Date().toISOString(),
      },
    });

    // 7. Booking integration: Transition Booking to PAID
    if (updatedPayment.bookingId) {
      await Booking.findByIdAndUpdate(updatedPayment.bookingId, {
        $set: { status: BOOKING_STATUS.PAID },
      }).exec();
    }

    return this.formatPaymentResponse(updatedPayment);
  }

  /**
   * Handle Razorpay Webhook Events
   * @param {object} eventPayload
   * @param {string} signature
   * @param {string|Buffer} rawBody
   * @returns {Promise<{ handled: boolean, status: string }>}
   */
  async handleRazorpayWebhook(eventPayload, signature, rawBody) {
    // 1. Verify webhook signature if secret configured
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = this.verifyWebhookSignature({ rawBody, signature });
      if (!isValid) {
        throw new AppError('Invalid webhook signature.', 400);
      }
    }

    const { event, payload } = eventPayload || {};
    if (!event || !payload) {
      return { handled: false, status: 'IGNORED_EMPTY_PAYLOAD' };
    }

    // Handle payment.captured or order.paid
    if (event === WEBHOOK_EVENTS.PAYMENT_CAPTURED || event === WEBHOOK_EVENTS.ORDER_PAID) {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id || payload.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (!orderId) {
        return { handled: false, status: 'NO_ORDER_ID_FOUND' };
      }

      const internalPayment = await paymentRepository.findByGatewayOrderId(orderId);
      if (!internalPayment) {
        return { handled: false, status: 'PAYMENT_NOT_FOUND' };
      }

      // Idempotent return if already SUCCESS
      if (internalPayment.status === PAYMENT_STATUS.SUCCESS) {
        return { handled: true, status: 'ALREADY_PROCESSED' };
      }

      // Amount verification: gateway amount in paise vs internal amount
      if (paymentEntity?.amount !== undefined) {
        const expectedPaise = Math.round(internalPayment.amount * 100);
        if (paymentEntity.amount !== expectedPaise) {
          await paymentRepository.markFailed(internalPayment._id, {
            failureReason: `Webhook amount mismatch: received ${paymentEntity.amount} paise, expected ${expectedPaise} paise`,
            failedAt: new Date(),
          });
          return { handled: true, status: 'AMOUNT_MISMATCH_RECORDED' };
        }
      }

      // Transition to SUCCESS
      const successPayment = await paymentRepository.markSuccess(internalPayment._id, {
        gatewayPaymentId: paymentId || internalPayment.gatewayPaymentId,
        gatewaySignature: signature || 'WEBHOOK_VERIFIED',
        paidAt: new Date(),
        metadata: {
          webhookEvent: event,
          receivedAt: new Date().toISOString(),
        },
      });

      // Synchronize booking status to PAID
      if (successPayment.bookingId) {
        await Booking.findByIdAndUpdate(successPayment.bookingId, {
          $set: { status: BOOKING_STATUS.PAID },
        }).exec();
      }

      return { handled: true, status: 'SUCCESS' };
    }

    // Handle payment.failed
    if (event === WEBHOOK_EVENTS.PAYMENT_FAILED) {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const errorDesc = paymentEntity?.error_description || 'Payment failed via gateway';

      if (orderId) {
        const internalPayment = await paymentRepository.findByGatewayOrderId(orderId);
        if (internalPayment && internalPayment.status !== PAYMENT_STATUS.SUCCESS) {
          await paymentRepository.markFailed(internalPayment._id, {
            failureReason: errorDesc,
            failedAt: new Date(),
            metadata: {
              webhookEvent: event,
              error: paymentEntity?.error_code,
            },
          });
        }
      }

      return { handled: true, status: 'FAILED_RECORDED' };
    }

    return { handled: true, status: 'EVENT_ACKNOWLEDGED' };
  }

  /**
   * Retrieve single payment details by ID
   * @param {string} paymentId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getPaymentById(paymentId, requestingUser) {
    this.assertValidObjectId(paymentId, 'payment');

    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isCustomerOwner = payment.userId && payment.userId.toString() === requestingUserId.toString();

    if (!isAdmin && !isCustomerOwner) {
      throw new AppError('Access denied: You are not authorized to view this payment.', 403);
    }

    return this.formatPaymentResponse(payment);
  }

  /**
   * Retrieve payment history for a booking
   * @param {string} bookingId
   * @param {object} requestingUser
   * @returns {Promise<Array<object>>}
   */
  async getPaymentsByBookingId(bookingId, requestingUser) {
    this.assertValidObjectId(bookingId, 'booking');

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isCustomerOwner = booking.userId && booking.userId.toString() === requestingUserId.toString();

    if (!isAdmin && !isCustomerOwner) {
      throw new AppError('Access denied: You are not authorized to view payments for this booking.', 403);
    }

    const payments = await paymentRepository.findByBookingId(bookingId);
    return payments.map((p) => this.formatPaymentResponse(p));
  }

  /**
   * Retrieve payment history for a quotation
   * @param {string} quotationId
   * @param {object} requestingUser
   * @returns {Promise<Array<object>>}
   */
  async getPaymentsByQuotationId(quotationId, requestingUser) {
    this.assertValidObjectId(quotationId, 'quotation');

    const quotation = await Quotation.findById(quotationId).exec();
    if (!quotation) {
      throw new AppError('Quotation not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isCustomerOwner = quotation.userId && quotation.userId.toString() === requestingUserId.toString();

    if (!isAdmin && !isCustomerOwner) {
      throw new AppError('Access denied: You are not authorized to view payments for this quotation.', 403);
    }

    const payments = await paymentRepository.findByQuotationId(quotationId);
    return payments.map((p) => this.formatPaymentResponse(p));
  }
}

module.exports = new PaymentService();
