const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_MODULES } = require('./admin.constants');

/**
 * Admin Audit Log Mongoose Schema
 *
 * Captures an immutable trail of administrative actions across all system modules.
 * Strictly forbids persisting passwords, tokens, payment secrets, or OTPs.
 */
const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin User ID is required.'],
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: [true, 'Audit action is required.'],
      index: true,
    },
    module: {
      type: String,
      enum: Object.values(AUDIT_MODULES),
      required: [true, 'Target module is required.'],
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required.'],
    },
    entityId: {
      type: String,
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Audit log description is required.'],
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// Compound indexes for administrative log queries
adminAuditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);

module.exports = AdminAuditLog;
