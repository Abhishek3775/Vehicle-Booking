const User = require('./user.model');
const { USER_ACCOUNT_STATUS } = require('./user.constants');

/**
 * User Repository
 *
 * Encapsulates all direct database operations for the User collection.
 * Contains zero HTTP or business logic.
 */
class UserRepository {
  /**
   * Find a user profile by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./user.model')|null>}
   */
  async findById(id) {
    return User.findById(id).exec();
  }

  /**
   * Find a user profile by domain userId (Auth identity reference)
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./user.model')|null>}
   */
  async findByUserId(userId) {
    return User.findOne({ userId }).exec();
  }

  /**
   * Find a user profile by Auth document _id (authId)
   * @param {string|import('mongoose').Types.ObjectId} authId
   * @returns {Promise<import('./user.model')|null>}
   */
  async findByAuthId(authId) {
    return User.findOne({ authId }).exec();
  }

  /**
   * Find a user profile by email address
   * @param {string} email
   * @returns {Promise<import('./user.model')|null>}
   */
  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  /**
   * Create a new user profile document
   * @param {object} userData
   * @returns {Promise<import('./user.model')>}
   */
  async createUser(userData) {
    return User.create(userData);
  }

  /**
   * Update user profile by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./user.model')|null>}
   */
  async updateById(id, updateData) {
    return User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Update user profile by domain userId
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {object} updateData
   * @returns {Promise<import('./user.model')|null>}
   */
  async updateByUserId(userId, updateData) {
    return User.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Deactivate user account by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./user.model')|null>}
   */
  async deactivateById(id) {
    return User.findByIdAndUpdate(
      id,
      {
        $set: {
          accountStatus: USER_ACCOUNT_STATUS.DEACTIVATED,
          deactivatedAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Deactivate user account by domain userId
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./user.model')|null>}
   */
  async deactivateByUserId(userId) {
    return User.findOneAndUpdate(
      { userId },
      {
        $set: {
          accountStatus: USER_ACCOUNT_STATUS.DEACTIVATED,
          deactivatedAt: new Date(),
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Update user profile image by MongoDB _id or domain userId
   * @param {string|import('mongoose').Types.ObjectId} identifier
   * @param {string} profileImage
   * @returns {Promise<import('./user.model')|null>}
   */
  async updateProfileImage(identifier, profileImage) {
    // Supports updating by userId or by _id
    const query = identifier.toString().length === 24
      ? { $or: [{ userId: identifier }, { _id: identifier }] }
      : { userId: identifier };

    return User.findOneAndUpdate(
      query,
      { $set: { profileImage } },
      { new: true, runValidators: true }
    ).exec();
  }
}

module.exports = new UserRepository();
