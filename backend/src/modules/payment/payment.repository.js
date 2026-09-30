const Payment = require('./payment.model');
const { PAYMENT_STATUS } = require('./payment.constants');

/**
 * Payment Repository Layer
 *
 * Dedicated database abstraction handling all MongoDB operations for Payment.
 * Contains zero HTTP or business logic.
 */
class PaymentRepository {
  /**
   * Insert a new payment record
   * @param {object} paymentData
   * @returns {Promise<Payment>}
   */
  async create(paymentData) {
    const payment = new Payment(paymentData);
    return payment.save();
  }

  /**
   * Find a payment by its MongoDB ID
   * @param {string} id
   * @returns {Promise<Payment|null>}
   */
  async findById(id) {
    return Payment.findById(id).exec();
  }

  /**
   * Find a payment by human-readable reference
   * @param {string} reference
   * @returns {Promise<Payment|null>}
   */
  async findByReference(reference) {
    return Payment.findOne({ paymentReference: reference.toUpperCase().trim() }).exec();
  }

  /**
   * Find a payment by Gateway Order ID (e.g. Razorpay order_xxx)
   * @param {string} orderId
   * @returns {Promise<Payment|null>}
   */
  async findByGatewayOrderId(orderId) {
    if (!orderId) return null;
    return Payment.findOne({ gatewayOrderId: orderId.trim() }).exec();
  }

  /**
   * Find a payment by Gateway Payment ID (e.g. Razorpay pay_xxx)
   * @param {string} paymentId
   * @returns {Promise<Payment|null>}
   */
  async findByGatewayPaymentId(paymentId) {
    if (!paymentId) return null;
    return Payment.findOne({ gatewayPaymentId: paymentId.trim() }).exec();
  }

  /**
   * Find all payments associated with a quotation
   * @param {string} quotationId
   * @returns {Promise<Array<Payment>>}
   */
  async findByQuotationId(quotationId) {
    return Payment.find({ quotationId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find all payments associated with a booking
   * @param {string} bookingId
   * @returns {Promise<Array<Payment>>}
   */
  async findByBookingId(bookingId) {
    return Payment.find({ bookingId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find payments by user ID with pagination
   * @param {object} params
   * @param {string} params.userId
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=10]
   * @returns {Promise<Array<Payment>>}
   */
  async findByUserId({ userId, filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10 }) {
    return Payment.find({ userId, ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Count payments by user ID
   * @param {object} params
   * @param {string} params.userId
   * @param {object} [params.filter={}]
   * @returns {Promise<number>}
   */
  async countByUserId({ userId, filter = {} }) {
    return Payment.countDocuments({ userId, ...filter }).exec();
  }

  /**
   * Find successful payment for a quotation
   * @param {string} quotationId
   * @returns {Promise<Payment|null>}
   */
  async findSuccessfulPaymentByQuotation(quotationId) {
    return Payment.findOne({
      quotationId,
      status: PAYMENT_STATUS.SUCCESS,
    }).exec();
  }

  /**
   * Find active pending or created payment for a quotation
   * @param {string} quotationId
   * @returns {Promise<Payment|null>}
   */
  async findPendingPaymentByQuotation(quotationId) {
    return Payment.findOne({
      quotationId,
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] },
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update payment document by ID
   * @param {string} id
   * @param {object} updateData
   * @returns {Promise<Payment|null>}
   */
  async updateById(id, updateData) {
    return Payment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Mark payment as SUCCESS with gateway transaction details
   * @param {string} id
   * @param {object} details
   * @returns {Promise<Payment|null>}
   */
  async markSuccess(id, { gatewayPaymentId, gatewaySignature, paidAt = new Date(), metadata = {} }) {
    return Payment.findByIdAndUpdate(
      id,
      {
        $set: {
          status: PAYMENT_STATUS.SUCCESS,
          gatewayPaymentId,
          gatewaySignature,
          paidAt,
          metadata,
          failureReason: null,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Mark payment as FAILED
   * @param {string} id
   * @param {object} details
   * @returns {Promise<Payment|null>}
   */
  async markFailed(id, { failureReason, failedAt = new Date(), metadata = {} }) {
    return Payment.findByIdAndUpdate(
      id,
      {
        $set: {
          status: PAYMENT_STATUS.FAILED,
          failureReason,
          failedAt,
          metadata,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Mark payment as CANCELLED
   * @param {string} id
   * @param {object} details
   * @returns {Promise<Payment|null>}
   */
  async markCancelled(id, { cancelledAt = new Date(), metadata = {} }) {
    return Payment.findByIdAndUpdate(
      id,
      {
        $set: {
          status: PAYMENT_STATUS.CANCELLED,
          cancelledAt,
          metadata,
        },
      },
      { new: true }
    ).exec();
  }
}

module.exports = new PaymentRepository();
