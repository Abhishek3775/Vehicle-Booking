const mongoose = require('mongoose');
const {
  QUOTATION_STATUS,
  CUSTOMER_RESPONSE,
  ITEM_TYPES,
  DISCOUNT_TYPES,
  CURRENCIES,
  QUOTATION_LIMITS,
} = require('./quotation.constants');

/**
 * Quotation Line Item Sub-Schema
 */
const quotationItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: {
        values: Object.values(ITEM_TYPES),
        message: '{VALUE} is not a valid item type',
      },
      default: ITEM_TYPES.SERVICE,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [QUOTATION_LIMITS.ITEM_NAME_MIN_LENGTH, `Item name must be at least ${QUOTATION_LIMITS.ITEM_NAME_MIN_LENGTH} characters`],
      maxlength: [QUOTATION_LIMITS.ITEM_NAME_MAX_LENGTH, `Item name cannot exceed ${QUOTATION_LIMITS.ITEM_NAME_MAX_LENGTH} characters`],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    discount: {
      type: Number,
      min: [0, 'Item discount cannot be negative'],
      default: 0,
    },
    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative'],
      default: 0,
    },
    total: {
      type: Number,
      required: [true, 'Item total is required'],
      min: [0, 'Item total cannot be negative'],
    },
  },
  { _id: true }
);

/**
 * Quotation Schema
 *
 * Stores customer-facing price estimates and line items derived from inspection findings.
 */
const quotationSchema = new mongoose.Schema(
  {
    quotationReference: {
      type: String,
      required: [true, 'Quotation reference is required'],
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    inspectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection reference is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer user reference is required'],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle reference is required'],
      index: true,
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mechanic reference is required'],
      index: true,
    },
    items: {
      type: [quotationItemSchema],
      required: [true, 'Quotation must have at least one line item'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Quotation items cannot be empty',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    discount: {
      type: {
        type: String,
        enum: Object.values(DISCOUNT_TYPES),
        default: DISCOUNT_TYPES.FIXED,
      },
      value: {
        type: Number,
        min: [0, 'Discount value cannot be negative'],
        default: 0,
      },
      amount: {
        type: Number,
        min: [0, 'Discount amount cannot be negative'],
        default: 0,
      },
    },
    tax: {
      rate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative'],
        default: 0,
      },
      amount: {
        type: Number,
        min: [0, 'Tax amount cannot be negative'],
        default: 0,
      },
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    currency: {
      type: String,
      enum: Object.values(CURRENCIES),
      default: CURRENCIES.INR,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(QUOTATION_STATUS),
        message: '{VALUE} is not a valid quotation status',
      },
      default: QUOTATION_STATUS.DRAFT,
      index: true,
    },
    customerResponse: {
      type: String,
      enum: Object.values(CUSTOMER_RESPONSE),
      default: CUSTOMER_RESPONSE.PENDING,
    },
    customerResponseAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [QUOTATION_LIMITS.REASON_MAX_LENGTH, `Rejection reason cannot exceed ${QUOTATION_LIMITS.REASON_MAX_LENGTH} characters`],
      default: null,
    },
    validUntil: {
      type: Date,
      default: () => new Date(Date.now() + QUOTATION_LIMITS.DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [QUOTATION_LIMITS.NOTES_MAX_LENGTH, `Notes cannot exceed ${QUOTATION_LIMITS.NOTES_MAX_LENGTH} characters`],
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
quotationSchema.index({ bookingId: 1, status: 1 });
quotationSchema.index({ inspectionId: 1, status: 1 });
quotationSchema.index({ userId: 1, createdAt: -1 });
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ bookingId: 1, version: -1 });

const Quotation = mongoose.model('Quotation', quotationSchema);

module.exports = Quotation;
