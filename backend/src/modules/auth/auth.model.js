const mongoose = require('mongoose');
const { ROLES, ACCOUNT_STATUS } = require('./auth.constants');

/**
 * Authentication Schema
 *
 * Dedicated strictly to authentication, credentials, OTP verification,
 * tokens, and account access status. Profile and personal details belong
 * to the User module.
 */
const authSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
      default: () => new mongoose.Types.ObjectId(),
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      sparse: true, // Allows multiple null values while keeping unique index for non-null emails
    },
    passwordHash: {
      type: String,
      default: null,
      select: false, // Do not expose password hash in default queries
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
      index: true,
    },
    otpHash: {
      type: String,
      default: null,
      select: false, // Do not expose OTP hash in default queries
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpLastRequestedAt: {
      type: Date,
      default: null,
    },
    otpRequestCount: {
      type: Number,
      default: 0,
    },
    otpWindowStartAt: {
      type: Date,
      default: null,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false, // Do not expose refresh token in default queries
    },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.otpHash;
        delete ret.passwordHash;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.otpHash;
        delete ret.passwordHash;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound and secondary indexes
authSchema.index({ phone: 1, accountStatus: 1 });
authSchema.index({ refreshToken: 1 }, { sparse: true });

const Auth = mongoose.model('Auth', authSchema);

module.exports = Auth;
