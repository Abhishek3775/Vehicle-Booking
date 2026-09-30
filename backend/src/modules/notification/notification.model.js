const mongoose = require('mongoose');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  DELIVERY_STATUS,
} = require('./notification.constants');

/**
 * Notification Mongoose Schema
 *
 * Persists in-app notification records and tracks push delivery state.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient User ID is required.'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true,
      maxlength: [200, 'Notification title cannot exceed 200 characters.'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required.'],
      trim: true,
      maxlength: [1000, 'Notification message cannot exceed 1000 characters.'],
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: [true, 'Notification type is required.'],
    },
    category: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORIES),
      required: [true, 'Notification category is required.'],
      index: true,
    },
    entityType: {
      type: String,
      enum: ['BOOKING', 'DISPATCH', 'INSPECTION', 'QUOTATION', 'PAYMENT', 'INVOICE', 'USER', 'SYSTEM'],
      default: 'SYSTEM',
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    channels: [
      {
        type: String,
        enum: Object.values(NOTIFICATION_CHANNELS),
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deliveryStatus: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.SENT,
    },
    deliveryError: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for high-speed listing and badge counting
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, isDeleted: 1 });
notificationSchema.index({ entityType: 1, entityId: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
