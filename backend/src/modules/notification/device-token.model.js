const mongoose = require('mongoose');
const { DEVICE_PLATFORMS } = require('./notification.constants');

/**
 * Device Token Mongoose Schema
 *
 * Manages active push notification tokens (e.g. Firebase FCM) for multi-device delivery.
 */
const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Device push token is required.'],
      trim: true,
      unique: true,
      index: true,
    },
    platform: {
      type: String,
      enum: Object.values(DEVICE_PLATFORMS),
      required: [true, 'Device platform is required.'],
    },
    deviceId: {
      type: String,
      required: [true, 'Unique device identifier is required.'],
      trim: true,
      index: true,
    },
    appVersion: {
      type: String,
      trim: true,
      default: '1.0.0',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for user device lookups
deviceTokenSchema.index({ userId: 1, deviceId: 1 });
deviceTokenSchema.index({ userId: 1, isActive: 1 });

const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);

module.exports = DeviceToken;
