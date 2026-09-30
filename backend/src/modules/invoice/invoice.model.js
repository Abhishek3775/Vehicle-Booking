const mongoose = require('mongoose');
const {
  INVOICE_STATUS,
  INVOICE_PAYMENT_STATUS,
  CURRENCIES,
  ITEM_TYPES,
  DISCOUNT_TYPES,
} = require('./invoice.constants');

/**
 * Invoice Item Sub-Schema
 * Preserves the exact line item snapshots from the approved quotation.
 */
const invoiceItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: Object.values(ITEM_TYPES),
      default: ITEM_TYPES.SERVICE,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Item name is required.'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Quantity must be at least 1.'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required.'],
      min: [0, 'Unit price cannot be negative.'],
    },
    discount: {
      type: Number,
      min: [0, 'Item discount cannot be negative.'],
      default: 0,
    },
    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative.'],
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative.'],
      default: 0,
    },
    total: {
      type: Number,
      required: [true, 'Item total is required.'],
      min: [0, 'Item total cannot be negative.'],
    },
  },
  { _id: true }
);

/**
 * Invoice Mongoose Schema
 *
 * Immutable permanent billing record issued after verified payment settlement.
 * Preserves historical customer, vehicle, payment, and quotation line item snapshots.
 */
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    invoiceReference: {
      type: String,
      required: [true, 'Invoice reference is required.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required.'],
      index: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      required: [true, 'Quotation ID is required.'],
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is required.'],
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer User ID is required.'],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required.'],
      index: true,
    },
    customerSnapshot: {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String, default: '' },
      email: { type: String, default: null },
      phone: { type: String, default: '' },
      billingAddress: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    vehicleSnapshot: {
      vehicleId: { type: mongoose.Schema.Types.ObjectId, required: true },
      vehicleType: { type: String, default: '' },
      make: { type: String, default: '' },
      model: { type: String, default: '' },
      variant: { type: String, default: '' },
      registrationNumber: { type: String, default: '' },
      fuelType: { type: String, default: '' },
    },
    paymentSnapshot: {
      paymentId: { type: mongoose.Schema.Types.ObjectId, required: true },
      paymentMethod: { type: String, default: '' },
      paymentReference: { type: String, default: '' },
      gatewayPaymentId: { type: String, default: null },
      paidAt: { type: Date, default: null },
      amountPaid: { type: Number, required: true },
      currency: { type: String, default: CURRENCIES.INR },
    },
    items: {
      type: [invoiceItemSchema],
      required: [true, 'Invoice must contain at least one line item.'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Invoice items cannot be empty.',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required.'],
      min: [0, 'Subtotal cannot be negative.'],
    },
    discount: {
      type: {
        type: String,
        enum: Object.values(DISCOUNT_TYPES),
        default: DISCOUNT_TYPES.FIXED,
      },
      value: {
        type: Number,
        min: [0, 'Discount value cannot be negative.'],
        default: 0,
      },
      amount: {
        type: Number,
        min: [0, 'Discount amount cannot be negative.'],
        default: 0,
      },
    },
    tax: {
      rate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative.'],
        default: 0,
      },
      amount: {
        type: Number,
        min: [0, 'Tax amount cannot be negative.'],
        default: 0,
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required.'],
      min: [0, 'Total amount cannot be negative.'],
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required.'],
      min: [0, 'Amount paid cannot be negative.'],
    },
    amountDue: {
      type: Number,
      default: 0,
      min: [0, 'Amount due cannot be negative.'],
    },
    currency: {
      type: String,
      enum: Object.values(CURRENCIES),
      default: CURRENCIES.INR,
      trim: true,
      uppercase: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(INVOICE_PAYMENT_STATUS),
      default: INVOICE_PAYMENT_STATUS.PAID,
      index: true,
    },
    invoiceStatus: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.ISSUED,
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dueAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound Indexes for query efficiency
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ bookingId: 1, invoiceStatus: 1 });
invoiceSchema.index({ quotationId: 1, invoiceStatus: 1 });
invoiceSchema.index({ invoiceStatus: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
