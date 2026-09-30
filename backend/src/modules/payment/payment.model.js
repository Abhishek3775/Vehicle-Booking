const mongoose = require('mongoose');
const {
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_GATEWAYS,
  CURRENCIES,
} = require('./payment.constants');

/**
 * Payment Mongoose Schema
 *
 * Persists transactional records for quotation settlements.
 * Stores point-in-time financial amounts derived strictly from approved quotations.
 * Maintains gateway correlation IDs and state transition timestamps.
 */
const paymentSchema = new mongoose.Schema(
  {
    paymentReference: {
      type: String,
      required: [true, 'Payment reference is required.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      required: [true, 'Quotation ID is required.'],
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required.'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer User ID is required.'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required.'],
      min: [0, 'Payment amount cannot be negative.'],
    },
    currency: {
      type: String,
      enum: Object.values(CURRENCIES),
      default: CURRENCIES.INR,
      trim: true,
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.RAZORPAY,
      trim: true,
      uppercase: true,
    },
    paymentGateway: {
      type: String,
      enum: Object.values(PAYMENT_GATEWAYS),
      default: PAYMENT_GATEWAYS.RAZORPAY,
      trim: true,
      uppercase: true,
    },
    gatewayOrderId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    gatewayPaymentId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    gatewaySignature: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative.'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for query optimization
paymentSchema.index({ quotationId: 1, status: 1 });
paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
