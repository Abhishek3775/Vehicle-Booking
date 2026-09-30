const Dispatch = require('./dispatch.model');
const Auth = require('../auth/auth.model');
const User = require('../user/user.model');
const { ROLES, ACCOUNT_STATUS } = require('../auth/auth.constants');
const { ACTIVE_DISPATCH_STATUSES, DISPATCH_STATUS } = require('./dispatch.constants');

/**
 * Dispatch Repository
 *
 * Encapsulates direct database operations for the Dispatch collection
 * and cross-module mechanic queries from Auth/User collections.
 * Contains zero HTTP or business rules.
 */
class DispatchRepository {
  /**
   * Create a new dispatch record
   * @param {object} dispatchData
   * @returns {Promise<import('./dispatch.model')>}
   */
  async create(dispatchData) {
    return Dispatch.create(dispatchData);
  }

  /**
   * Find dispatch by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./dispatch.model')|null>}
   */
  async findById(id) {
    return Dispatch.findById(id).exec();
  }

  /**
   * Find all dispatches associated with a booking
   * @param {string|import('mongoose').Types.ObjectId} bookingId
   * @returns {Promise<Array<import('./dispatch.model')>>}
   */
  async findByBookingId(bookingId) {
    return Dispatch.find({ bookingId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find currently active dispatch for a booking
   * @param {string|import('mongoose').Types.ObjectId} bookingId
   * @returns {Promise<import('./dispatch.model')|null>}
   */
  async findActiveByBookingId(bookingId) {
    return Dispatch.findOne({
      bookingId,
      status: { $in: ACTIVE_DISPATCH_STATUSES },
    }).exec();
  }

  /**
   * Find active assignments for a specific mechanic
   * @param {string|import('mongoose').Types.ObjectId} mechanicId
   * @returns {Promise<Array<import('./dispatch.model')>>}
   */
  async findMechanicActiveAssignments(mechanicId) {
    return Dispatch.find({
      mechanicId,
      status: { $in: [DISPATCH_STATUS.ASSIGNED, DISPATCH_STATUS.ACCEPTED] },
    }).exec();
  }

  /**
   * Find all active mechanics available on the platform
   * @returns {Promise<Array<object>>}
   */
  async findEligibleMechanics() {
    // 1. Find all active auth records with MECHANIC role
    const activeMechanicAuths = await Auth.find({
      role: ROLES.MECHANIC,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    }).exec();

    if (activeMechanicAuths.length === 0) {
      return [];
    }

    const mechanicUserIds = activeMechanicAuths.map((a) => a.userId);

    // 2. Fetch corresponding user profiles
    const userProfiles = await User.find({
      userId: { $in: mechanicUserIds },
    }).exec();

    const userProfileMap = new Map();
    for (const profile of userProfiles) {
      userProfileMap.set(profile.userId.toString(), profile);
    }

    return activeMechanicAuths.map((auth) => {
      const profile = userProfileMap.get(auth.userId.toString());
      return {
        userId: auth.userId.toString(),
        phone: auth.phone,
        email: auth.email,
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        profileImage: profile?.profileImage || null,
        accountStatus: auth.accountStatus,
        role: auth.role,
        preferences: profile?.preferences || {},
      };
    });
  }

  /**
   * Find mechanic by userId
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<object|null>}
   */
  async findMechanicById(userId) {
    const auth = await Auth.findOne({
      userId,
      role: ROLES.MECHANIC,
    }).exec();

    if (!auth) return null;

    const profile = await User.findOne({ userId }).exec();

    return {
      userId: auth.userId.toString(),
      phone: auth.phone,
      email: auth.email,
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      accountStatus: auth.accountStatus,
      role: auth.role,
    };
  }

  /**
   * Update dispatch record by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./dispatch.model')|null>}
   */
  async updateById(id, updateData) {
    return Dispatch.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Find multiple dispatches with filtering, sorting, and pagination
   * @param {object} params
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=20]
   * @returns {Promise<Array<import('./dispatch.model')>>}
   */
  async findMany({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 20 } = {}) {
    return Dispatch.find(filter).sort(sort).skip(skip).limit(limit).exec();
  }

  /**
   * Count dispatches matching filter
   * @param {object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return Dispatch.countDocuments(filter).exec();
  }
}

module.exports = new DispatchRepository();
