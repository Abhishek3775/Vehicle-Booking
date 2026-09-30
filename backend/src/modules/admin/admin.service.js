const crypto = require('crypto');
const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const adminRepository = require('./admin.repository');
const User = require('../user/user.model');
const Auth = require('../auth/auth.model');
const Vehicle = require('../vehicle/vehicle.model');
const Mechanic = require('../mechanic/mechanic.model');
const mechanicService = require('../mechanic/mechanic.service');
const Booking = require('../booking/booking.model');
const Inspection = require('../inspection/inspection.model');
const Quotation = require('../quotation/quotation.model');
const Payment = require('../payment/payment.model');
const Invoice = require('../invoice/invoice.model');
const {
  ADMIN_STATUS,
  ADMIN_PERMISSIONS,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  PAGINATION_LIMITS,
} = require('./admin.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { PAYMENT_STATUS } = require('../payment/payment.constants');

/**
 * Admin Service Layer
 *
 * Provides central orchestration and administrative controls for:
 * - Admin profile and permissions
 * - High-speed dashboard metrics and financial revenue aggregations
 * - Customer user management and status controls
 * - Mechanic verification management
 * - End-to-end booking inspection, quotation, payment, and billing oversight
 * - Immutable administrative audit trails
 */
class AdminService {
  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='id']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'id') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Record an administrative audit log
   * @param {object} params
   * @returns {Promise<object>}
   */
  async logAction({
    adminId,
    action,
    module: targetModule,
    entityType,
    entityId = null,
    description,
    metadata = {},
    req = null,
  }) {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    return adminRepository.createAuditLog({
      adminId: new mongoose.Types.ObjectId(adminId.toString()),
      action,
      module: targetModule,
      entityType,
      entityId: entityId ? entityId.toString() : null,
      description,
      metadata,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : null,
      userAgent: typeof userAgent === 'string' ? userAgent : null,
      createdAt: new Date(),
    });
  }

  /**
   * Retrieve authenticated Admin profile
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getAdminProfile(userId) {
    this.assertValidObjectId(userId, 'user');

    const [userDoc, authDoc, adminDoc] = await Promise.all([
      User.findOne({ userId }).exec(),
      Auth.findOne({ userId }).exec(),
      adminRepository.findAdminByUserId(userId),
    ]);

    let profile = adminDoc;
    if (!profile) {
      // Auto-initialize admin profile if first access
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const adminCode = `ADM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

      profile = await adminRepository.createAdmin({
        userId: new mongoose.Types.ObjectId(userId),
        adminCode,
        displayName: userDoc ? `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() : 'System Administrator',
        department: 'Operations',
        permissions: Object.values(ADMIN_PERMISSIONS),
        status: ADMIN_STATUS.ACTIVE,
        lastLoginAt: authDoc?.lastLoginAt || new Date(),
      });
    }

    return {
      userId,
      adminCode: profile.adminCode,
      displayName: profile.displayName || userDoc?.firstName || 'Administrator',
      email: userDoc?.email || authDoc?.email || null,
      phone: authDoc?.phone || '',
      department: profile.department || 'Operations',
      permissions: profile.permissions || Object.values(ADMIN_PERMISSIONS),
      status: profile.status || ADMIN_STATUS.ACTIVE,
      lastLoginAt: authDoc?.lastLoginAt || profile.lastLoginAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Update Admin profile
   * @param {string} userId
   * @param {object} payload
   * @param {object} [req]
   * @returns {Promise<object>}
   */
  async updateAdminProfile(userId, { displayName, department, profileImage }, req = null) {
    this.assertValidObjectId(userId, 'user');

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (department !== undefined) updateData.department = department;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    const updated = await adminRepository.updateAdminProfile(userId, updateData);

    await this.logAction({
      adminId: userId,
      action: AUDIT_ACTIONS.UPDATE_PROFILE,
      module: AUDIT_MODULES.ADMIN,
      entityType: 'Admin',
      entityId: userId,
      description: 'Admin profile updated',
      metadata: updateData,
      req,
    });

    return this.getAdminProfile(userId);
  }

  /**
   * Retrieve platform dashboard overview metrics
   * @returns {Promise<object>}
   */
  async getDashboardSummary() {
    const counts = await adminRepository.getDashboardCounts();
    const revenue = await adminRepository.getRevenueStats();

    return {
      ...counts,
      revenue: {
        total: revenue.totalRevenue,
        currency: 'INR',
        transactionCount: revenue.transactionCount,
      },
    };
  }

  /**
   * Aggregate periodic booking trends
   * @param {object} params
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @param {string} [params.status]
   * @returns {Promise<Array<object>>}
   */
  async getBookingAnalytics({ startDate, endDate, status } = {}) {
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (status) {
      const normStatus = status.toUpperCase().trim();
      if (Object.values(BOOKING_STATUS).includes(normStatus)) {
        filter.status = normStatus;
      }
    }

    return adminRepository.getBookingAnalytics(filter);
  }

  /**
   * Calculate revenue from successful payments
   * @param {object} params
   * @param {string} [params.startDate]
   * @param {string} [params.endDate]
   * @returns {Promise<object>}
   */
  async getRevenueAnalytics({ startDate, endDate } = {}) {
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) dateFilter.paidAt.$gte = new Date(startDate);
      if (endDate) dateFilter.paidAt.$lte = new Date(endDate);
    }

    const stats = await adminRepository.getRevenueStats(dateFilter);
    return {
      totalRevenue: stats.totalRevenue,
      currency: 'INR',
      transactionCount: stats.transactionCount,
      startDate: startDate || null,
      endDate: endDate || null,
    };
  }

  /**
   * Retrieve mechanic dashboard statistics
   * @returns {Promise<object>}
   */
  async getMechanicsAnalytics() {
    return adminRepository.getMechanicStats();
  }

  /**
   * Retrieve list of platform users with pagination, search, and status filters
   * @param {object} params
   * @param {object} [params.query={}]
   * @returns {Promise<{ users: Array<object>, pagination: object }>}
   */
  async getUsersList({ query = {} } = {}) {
    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.status) {
      filter.accountStatus = query.status.toUpperCase().trim();
    }

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      User.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      users: users.map((u) => ({
        id: u._id.toString(),
        userId: u.userId.toString(),
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        gender: u.gender,
        accountStatus: u.accountStatus,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve detailed user record with vehicles and bookings summary
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getUserDetails(userId) {
    this.assertValidObjectId(userId, 'user');

    const [userDoc, authDoc, vehicles, bookingsCount] = await Promise.all([
      User.findOne({ userId }).exec(),
      Auth.findOne({ userId }).exec(),
      Vehicle.find({ userId, isDeleted: false }).exec(),
      Booking.countDocuments({ userId }).exec(),
    ]);

    if (!userDoc && !authDoc) {
      throw new AppError('User not found.', 404);
    }

    return {
      userId,
      name: userDoc ? `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() : 'User',
      firstName: userDoc?.firstName || '',
      lastName: userDoc?.lastName || '',
      email: userDoc?.email || authDoc?.email || null,
      phone: authDoc?.phone || '',
      role: authDoc?.role || 'CUSTOMER',
      accountStatus: userDoc?.accountStatus || authDoc?.accountStatus || 'ACTIVE',
      isPhoneVerified: Boolean(authDoc?.isPhoneVerified),
      lastLoginAt: authDoc?.lastLoginAt || null,
      vehiclesCount: vehicles.length,
      vehicles: vehicles.map((v) => ({
        id: v._id.toString(),
        make: v.make,
        model: v.model,
        variant: v.variant || '',
        registrationNumber: v.registrationNumber,
        vehicleType: v.vehicleType,
        fuelType: v.fuelType,
      })),
      bookingsCount,
      createdAt: userDoc?.createdAt || authDoc?.createdAt,
      updatedAt: userDoc?.updatedAt || authDoc?.updatedAt,
    };
  }

  /**
   * Update user account status
   * @param {string} targetUserId
   * @param {object} payload
   * @param {string} payload.status
   * @param {string} [payload.reason]
   * @param {string} requestingAdminId
   * @param {object} [req]
   * @returns {Promise<object>}
   */
  async updateUserStatus(targetUserId, { status, reason }, requestingAdminId, req = null) {
    this.assertValidObjectId(targetUserId, 'user');

    const [updatedUser, updatedAuth] = await Promise.all([
      User.findOneAndUpdate(
        { userId: targetUserId },
        { $set: { accountStatus: status } },
        { new: true }
      ).exec(),
      Auth.findOneAndUpdate(
        { userId: targetUserId },
        { $set: { accountStatus: status } },
        { new: true }
      ).exec(),
    ]);

    if (!updatedUser && !updatedAuth) {
      throw new AppError('User not found.', 404);
    }

    await this.logAction({
      adminId: requestingAdminId,
      action: AUDIT_ACTIONS.UPDATE_USER_STATUS,
      module: AUDIT_MODULES.USER,
      entityType: 'User',
      entityId: targetUserId,
      description: `User account status changed to '${status}'. Reason: ${reason}`,
      metadata: { newStatus: status, reason },
      req,
    });

    return {
      userId: targetUserId,
      accountStatus: status,
      message: `User account status successfully updated to '${status}'.`,
    };
  }

  /**
   * Retrieve list of mechanics with filters
   * @param {object} params
   * @param {object} [params.query={}]
   * @returns {Promise<{ mechanics: Array<object>, pagination: object }>}
   */
  async getMechanicsList({ query = {} } = {}) {
    return mechanicService.getMechanicsList({ query, userRole: 'ADMIN' });
  }

  /**
   * Retrieve single mechanic details
   * @param {string} mechanicId
   * @returns {Promise<object>}
   */
  async getMechanicDetails(mechanicId) {
    this.assertValidObjectId(mechanicId, 'mechanic');
    return mechanicService.getMechanicProfileById(mechanicId, 'ADMIN');
  }

  /**
   * Update mechanic verification status
   * @param {string} mechanicId
   * @param {object} payload
   * @param {string} payload.verificationStatus
   * @param {string} [payload.reason]
   * @param {string} requestingAdminId
   * @param {object} [req]
   * @returns {Promise<object>}
   */
  async updateMechanicVerification(mechanicId, { verificationStatus, reason }, requestingAdminId, req = null) {
    this.assertValidObjectId(mechanicId, 'mechanic');

    const updatedMechanic = await mechanicService.updateVerificationStatus(
      mechanicId,
      { verificationStatus, reason },
      requestingAdminId
    );

    await this.logAction({
      adminId: requestingAdminId,
      action: AUDIT_ACTIONS.VERIFY_MECHANIC,
      module: AUDIT_MODULES.MECHANIC,
      entityType: 'Mechanic',
      entityId: mechanicId,
      description: `Mechanic verification status changed to '${verificationStatus}'. Reason: ${reason}`,
      metadata: { verificationStatus, reason },
      req,
    });

    return updatedMechanic;
  }

  /**
   * Retrieve paginated bookings list with rich filters
   * @param {object} params
   * @param {object} [params.query={}]
   * @returns {Promise<{ bookings: Array<object>, pagination: object }>}
   */
  async getBookingsList({ query = {} } = {}) {
    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.status) {
      const normStatus = query.status.toUpperCase().trim();
      if (Object.values(BOOKING_STATUS).includes(normStatus)) {
        filter.status = normStatus;
      }
    }

    if (query.bookingType) {
      filter.bookingType = query.bookingType.toUpperCase().trim();
    }

    if (query.userId && mongoose.Types.ObjectId.isValid(query.userId.trim())) {
      filter.userId = new mongoose.Types.ObjectId(query.userId.trim());
    }

    if (query.bookingReference) {
      filter.bookingReference = new RegExp(query.bookingReference.trim(), 'i');
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Booking.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      bookings: bookings.map((b) => ({
        id: b._id.toString(),
        bookingReference: b.bookingReference,
        userId: b.userId.toString(),
        vehicleId: b.vehicleId ? b.vehicleId.toString() : null,
        bookingType: b.bookingType,
        status: b.status,
        scheduledAt: b.scheduledAt,
        createdAt: b.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve full booking overview with related inspection, quotation, payment, and invoice
   * @param {string} bookingId
   * @returns {Promise<object>}
   */
  async getBookingDetails(bookingId) {
    this.assertValidObjectId(bookingId, 'booking');

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const [inspections, quotations, payments, invoices] = await Promise.all([
      Inspection.find({ bookingId }).sort({ createdAt: -1 }).exec(),
      Quotation.find({ bookingId }).sort({ createdAt: -1 }).exec(),
      Payment.find({ bookingId }).sort({ createdAt: -1 }).exec(),
      Invoice.find({ bookingId }).sort({ createdAt: -1 }).exec(),
    ]);

    return {
      booking: {
        id: booking._id.toString(),
        bookingReference: booking.bookingReference,
        userId: booking.userId.toString(),
        vehicleId: booking.vehicleId ? booking.vehicleId.toString() : null,
        bookingType: booking.bookingType,
        status: booking.status,
        addressSnapshot: booking.addressSnapshot,
        vehicleSnapshot: booking.vehicleSnapshot,
        serviceSnapshot: booking.serviceSnapshot,
        packageSnapshot: booking.packageSnapshot,
        customerNotes: booking.customerNotes,
        cancellationReason: booking.cancellationReason,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
      inspections: inspections.map((insp) => ({
        id: insp._id.toString(),
        inspectionReference: insp.inspectionReference,
        status: insp.status,
        findingsCount: (insp.findings || []).length,
        createdAt: insp.createdAt,
      })),
      quotations: quotations.map((q) => ({
        id: q._id.toString(),
        quotationReference: q.quotationReference,
        totalAmount: q.totalAmount,
        status: q.status,
        createdAt: q.createdAt,
      })),
      payments: payments.map((p) => ({
        id: p._id.toString(),
        paymentReference: p.paymentReference,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
      })),
      invoices: invoices.map((inv) => ({
        id: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        invoiceStatus: inv.invoiceStatus,
        issuedAt: inv.issuedAt,
      })),
    };
  }

  /**
   * Cancel a booking by Administrator
   * @param {string} bookingId
   * @param {object} payload
   * @param {string} payload.cancellationReason
   * @param {string} requestingAdminId
   * @param {object} [req]
   * @returns {Promise<object>}
   */
  async cancelBooking(bookingId, { cancellationReason }, requestingAdminId, req = null) {
    this.assertValidObjectId(bookingId, 'booking');

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new AppError('Booking is already cancelled.', 400);
    }

    if (booking.status === BOOKING_STATUS.CLOSED) {
      throw new AppError('Cannot cancel a closed booking.', 400);
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancellationReason,
          cancelledBy: new mongoose.Types.ObjectId(requestingAdminId),
          cancelledAt: new Date(),
        },
      },
      { new: true }
    ).exec();

    await this.logAction({
      adminId: requestingAdminId,
      action: AUDIT_ACTIONS.CANCEL_BOOKING,
      module: AUDIT_MODULES.BOOKING,
      entityType: 'Booking',
      entityId: bookingId,
      description: `Booking ${booking.bookingReference} cancelled by Administrator. Reason: ${cancellationReason}`,
      metadata: { bookingReference: booking.bookingReference, cancellationReason },
      req,
    });

    return {
      id: updatedBooking._id.toString(),
      bookingReference: updatedBooking.bookingReference,
      status: updatedBooking.status,
      cancellationReason: updatedBooking.cancellationReason,
      message: 'Booking successfully cancelled by Administrator.',
    };
  }

  /**
   * Retrieve administrative audit logs
   * @param {object} params
   * @param {object} [params.query={}]
   * @returns {Promise<{ logs: Array<object>, pagination: object }>}
   */
  async getAuditLogs({ query = {} } = {}) {
    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.adminId && mongoose.Types.ObjectId.isValid(query.adminId.trim())) {
      filter.adminId = new mongoose.Types.ObjectId(query.adminId.trim());
    }

    if (query.module) {
      filter.module = query.module.toUpperCase().trim();
    }

    if (query.action) {
      filter.action = query.action.toUpperCase().trim();
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      adminRepository.findAuditLogs({ filter, sort: { createdAt: -1 }, skip, limit }),
      adminRepository.countAuditLogs(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs: logs.map((l) => ({
        id: l._id.toString(),
        adminId: l.adminId.toString(),
        action: l.action,
        module: l.module,
        entityType: l.entityType,
        entityId: l.entityId,
        description: l.description,
        metadata: l.metadata,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Fast categorized multi-collection search
   * @param {string} q
   * @returns {Promise<object>}
   */
  async globalSearch(q) {
    if (!q || typeof q !== 'string' || !q.trim()) {
      return { users: [], bookings: [], mechanics: [], invoices: [] };
    }

    const searchStr = q.trim();
    const searchRegex = new RegExp(searchStr, 'i');
    const limit = 5;

    const [users, bookings, mechanics, invoices] = await Promise.all([
      User.find({
        $or: [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }],
      })
        .limit(limit)
        .exec(),
      Booking.find({
        bookingReference: searchRegex,
      })
        .limit(limit)
        .exec(),
      Mechanic.find({
        $or: [{ displayName: searchRegex }, { mechanicCode: searchRegex }],
      })
        .limit(limit)
        .exec(),
      Invoice.find({
        invoiceNumber: searchRegex,
      })
        .limit(limit)
        .exec(),
    ]);

    return {
      users: users.map((u) => ({
        id: u._id.toString(),
        userId: u.userId.toString(),
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        email: u.email,
      })),
      bookings: bookings.map((b) => ({
        id: b._id.toString(),
        bookingReference: b.bookingReference,
        status: b.status,
      })),
      mechanics: mechanics.map((m) => ({
        id: m._id.toString(),
        displayName: m.displayName,
        mechanicCode: m.mechanicCode,
      })),
      invoices: invoices.map((inv) => ({
        id: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
      })),
    };
  }
}

module.exports = new AdminService();
