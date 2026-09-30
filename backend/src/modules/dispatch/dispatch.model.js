const mongoose = require('mongoose');
const { DISPATCH_STATUS, ASSIGNMENT_TYPES } = require('./dispatch.constants');

/**
 * Dispatch Assignment History Schema
 * Preserves audit history across mechanic assignments and rejections.
 */
const assignmentHistorySchema = new mongoose.Schema(
  {
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignmentType: {
      type: String,
      enum: Object.values(ASSIGNMENT_TYPES),
      default: ASSIGNMENT_TYPES.MANUAL,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(DISPATCH_STATUS),
      default: DISPATCH_STATUS.ASSIGNED,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

/**
 * Dispatch Schema
 *
 * Manages mechanic discovery, assignment workflows, and response confirmations
 * for customer service bookings.
 */
const dispatchSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(DISPATCH_STATUS),
        message: '{VALUE} is not a valid dispatch status',
      },
      default: DISPATCH_STATUS.PENDING,
      index: true,
    },
    assignmentType: {
      type: String,
      enum: {
        values: Object.values(ASSIGNMENT_TYPES),
        message: '{VALUE} is not a valid assignment type',
      },
      default: ASSIGNMENT_TYPES.MANUAL,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      default: null,
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
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
      default: null,
    },
    assignmentAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Assignment attempts cannot be negative'],
    },
    assignmentHistory: {
      type: [assignmentHistorySchema],
      default: [],
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

// Compound indexes for dispatch lookups and monitoring
dispatchSchema.index({ bookingId: 1, status: 1 });
dispatchSchema.index({ mechanicId: 1, status: 1 });
dispatchSchema.index({ status: 1, createdAt: -1 });

const Dispatch = mongoose.model('Dispatch', dispatchSchema);

module.exports = Dispatch;
