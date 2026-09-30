const mongoose = require('mongoose');
const { ADMIN_STATUS, ADMIN_PERMISSIONS } = require('./admin.constants');

/**
 * Admin Profile Mongoose Schema
 *
 * Stores administrator-specific operational metadata, assigned department, and granular permissions.
 * Does NOT store authentication credentials (handled strictly by Auth model).
 */
const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      unique: true,
      index: true,
    },
    adminCode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    profileImage: {
      type: String,
      trim: true,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: 'Operations',
    },
    permissions: [
      {
        type: String,
        enum: Object.values(ADMIN_PERMISSIONS),
      },
    ],
    status: {
      type: String,
      enum: Object.values(ADMIN_STATUS),
      default: ADMIN_STATUS.ACTIVE,
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
  }
);

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
