const Admin = require('./admin.model');
const AdminAuditLog = require('./admin-audit-log.model');
const User = require('../user/user.model');
const Mechanic = require('../mechanic/mechanic.model');
const Booking = require('../booking/booking.model');
const Payment = require('../payment/payment.model');
const Invoice = require('../invoice/invoice.model');
const { PAYMENT_STATUS } = require('../payment/payment.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { VERIFICATION_STATUS, AVAILABILITY_STATUS, WORK_STATUS } = require('../mechanic/mechanic.constants');

/**
 * Admin Repository Layer
 *
 * Dedicated database abstraction for Admin profile, audit logs, and dashboard aggregations.
 */
class AdminRepository {
  /**
   * Find admin profile by User ID
   * @param {string} userId
   * @returns {Promise<Admin|null>}
   */
  async findAdminByUserId(userId) {
    return Admin.findOne({ userId }).exec();
  }

  /**
   * Create an admin profile
   * @param {object} data
   * @returns {Promise<Admin>}
   */
  async createAdmin(data) {
    const admin = new Admin(data);
    return admin.save();
  }

  /**
   * Update admin profile
   * @param {string} userId
   * @param {object} updateData
   * @returns {Promise<Admin|null>}
   */
  async updateAdminProfile(userId, updateData) {
    return Admin.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
  }

  /**
   * Create an audit log record
   * @param {object} logData
   * @returns {Promise<AdminAuditLog>}
   */
  async createAuditLog(logData) {
    const log = new AdminAuditLog(logData);
    return log.save();
  }

  /**
   * Find audit logs with pagination and filters
   * @param {object} params
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=20]
   * @returns {Promise<Array<AdminAuditLog>>}
   */
  async findAuditLogs({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 20 }) {
    return AdminAuditLog.find(filter).sort(sort).skip(skip).limit(limit).exec();
  }

  /**
   * Count total audit logs matching filter
   * @param {object} [filter={}]
   * @returns {Promise<number>}
   */
  async countAuditLogs(filter = {}) {
    return AdminAuditLog.countDocuments(filter).exec();
  }

  /**
   * Retrieve high-level platform counts in parallel
   * @returns {Promise<object>}
   */
  async getDashboardCounts() {
    const [
      totalUsers,
      activeUsers,
      totalMechanics,
      verifiedMechanics,
      availableMechanics,
      onJobMechanics,
      totalBookings,
      pendingBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      totalPayments,
      successfulPayments,
      failedPayments,
      totalInvoices,
      issuedInvoices,
    ] = await Promise.all([
      User.countDocuments({}).exec(),
      User.countDocuments({ accountStatus: 'ACTIVE' }).exec(),
      Mechanic.countDocuments({}).exec(),
      Mechanic.countDocuments({ verificationStatus: VERIFICATION_STATUS.VERIFIED }).exec(),
      Mechanic.countDocuments({ availabilityStatus: AVAILABILITY_STATUS.AVAILABLE }).exec(),
      Mechanic.countDocuments({ workStatus: WORK_STATUS.ON_JOB }).exec(),
      Booking.countDocuments({}).exec(),
      Booking.countDocuments({ status: BOOKING_STATUS.PENDING }).exec(),
      Booking.countDocuments({
        status: {
          $in: [
            BOOKING_STATUS.ASSIGNED,
            BOOKING_STATUS.ACCEPTED,
            BOOKING_STATUS.ON_THE_WAY,
            BOOKING_STATUS.ARRIVED,
            BOOKING_STATUS.INSPECTION,
            BOOKING_STATUS.IN_PROGRESS,
          ],
        },
      }).exec(),
      Booking.countDocuments({ status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.PAID, BOOKING_STATUS.CLOSED] } }).exec(),
      Booking.countDocuments({ status: BOOKING_STATUS.CANCELLED }).exec(),
      Payment.countDocuments({}).exec(),
      Payment.countDocuments({ status: PAYMENT_STATUS.SUCCESS }).exec(),
      Payment.countDocuments({ status: PAYMENT_STATUS.FAILED }).exec(),
      Invoice.countDocuments({}).exec(),
      Invoice.countDocuments({ invoiceStatus: 'ISSUED' }).exec(),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        blocked: Math.max(0, totalUsers - activeUsers),
      },
      mechanics: {
        total: totalMechanics,
        verified: verifiedMechanics,
        available: availableMechanics,
        onJob: onJobMechanics,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        active: activeBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      payments: {
        total: totalPayments,
        successful: successfulPayments,
        failed: failedPayments,
      },
      invoices: {
        total: totalInvoices,
        issued: issuedInvoices,
      },
    };
  }

  /**
   * Aggregate total revenue from SUCCESS payments
   * @param {object} [dateFilter={}]
   * @returns {Promise<{ totalRevenue: number, transactionCount: number }>}
   */
  async getRevenueStats(dateFilter = {}) {
    const match = { status: PAYMENT_STATUS.SUCCESS, ...dateFilter };

    const result = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]).exec();

    if (result && result.length > 0) {
      return {
        totalRevenue: Math.round(result[0].totalRevenue * 100) / 100,
        transactionCount: result[0].transactionCount,
      };
    }

    return { totalRevenue: 0, transactionCount: 0 };
  }

  /**
   * Aggregate daily booking analytics
   * @param {object} matchFilter
   * @returns {Promise<Array<object>>}
   */
  async getBookingAnalytics(matchFilter = {}) {
    return Booking.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [
                { $in: ['$status', [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.PAID, BOOKING_STATUS.CLOSED]] },
                1,
                0,
              ],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          completed: 1,
          cancelled: 1,
        },
      },
    ]).exec();
  }

  /**
   * Retrieve mechanic dashboard stats
   * @returns {Promise<object>}
   */
  async getMechanicStats() {
    const [
      total,
      available,
      unavailable,
      onJob,
      verified,
      pendingVerification,
    ] = await Promise.all([
      Mechanic.countDocuments({}).exec(),
      Mechanic.countDocuments({ availabilityStatus: AVAILABILITY_STATUS.AVAILABLE }).exec(),
      Mechanic.countDocuments({ availabilityStatus: AVAILABILITY_STATUS.OFFLINE }).exec(),
      Mechanic.countDocuments({ workStatus: WORK_STATUS.ON_JOB }).exec(),
      Mechanic.countDocuments({ verificationStatus: VERIFICATION_STATUS.VERIFIED }).exec(),
      Mechanic.countDocuments({ verificationStatus: VERIFICATION_STATUS.PENDING }).exec(),
    ]);

    return {
      total,
      available,
      unavailable,
      onJob,
      verified,
      pendingVerification,
    };
  }
}

module.exports = new AdminRepository();
