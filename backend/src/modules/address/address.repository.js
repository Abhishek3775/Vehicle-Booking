const Address = require('./address.model');
const { ADDRESS_STATUS } = require('./address.constants');

/**
 * Address Repository
 *
 * Encapsulates all direct database queries for the Address collection.
 * Contains zero HTTP or business logic.
 */
class AddressRepository {
  /**
   * Create a new address document
   * @param {object} addressData
   * @returns {Promise<import('./address.model')>}
   */
  async create(addressData) {
    return Address.create(addressData);
  }

  /**
   * Find address by its MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./address.model')|null>}
   */
  async findById(id) {
    return Address.findById(id).exec();
  }

  /**
   * Find address by _id and userId (Ownership-scoped query)
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./address.model')|null>}
   */
  async findByIdAndUserId(id, userId) {
    return Address.findOne({ _id: id, userId }).exec();
  }

  /**
   * Find all addresses belonging to a user
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {object} options
   * @param {string} [options.status] - Optional status filter, defaults to ACTIVE
   * @returns {Promise<Array<import('./address.model')>>}
   */
  async findByUserId(userId, { status = ADDRESS_STATUS.ACTIVE } = {}) {
    const query = { userId };
    if (status) {
      query.status = status;
    }
    return Address.find(query).sort({ isDefault: -1, createdAt: -1 }).exec();
  }

  /**
   * Find user's current default address
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./address.model')|null>}
   */
  async findDefaultAddress(userId) {
    return Address.findOne({ userId, isDefault: true, status: ADDRESS_STATUS.ACTIVE }).exec();
  }

  /**
   * Count active addresses for a user
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<number>}
   */
  async countActiveByUserId(userId) {
    return Address.countDocuments({ userId, status: ADDRESS_STATUS.ACTIVE }).exec();
  }

  /**
   * Update address by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./address.model')|null>}
   */
  async updateById(id, updateData) {
    return Address.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Deactivate address by _id (Soft delete and unsets default flag)
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./address.model')|null>}
   */
  async deactivateById(id) {
    return Address.findByIdAndUpdate(
      id,
      {
        $set: {
          status: ADDRESS_STATUS.INACTIVE,
          isDefault: false,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Clear isDefault flag on all addresses belonging to a user
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('mongodb').UpdateResult>}
   */
  async clearDefaultAddresses(userId) {
    return Address.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } }).exec();
  }

  /**
   * Atomically designate an address as default for a user
   * Clears existing default flag on all user's addresses and flags the target address
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./address.model')|null>}
   */
  async setDefaultAddress(id, userId) {
    await this.clearDefaultAddresses(userId);
    return Address.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isDefault: true } },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Find first active address for a user (useful for fallback default selection)
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./address.model')|null>}
   */
  async findFirstActiveByUserId(userId) {
    return Address.findOne({ userId, status: ADDRESS_STATUS.ACTIVE }).sort({ createdAt: 1 }).exec();
  }
}

module.exports = new AddressRepository();
