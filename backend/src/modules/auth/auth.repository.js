const Auth = require('./auth.model');

/**
 * Authentication Repository
 *
 * Encapsulates all direct database queries for the Auth collection.
 * Contains zero HTTP or business logic.
 */
class AuthRepository {
  /**
   * Find an auth record by phone number
   * @param {string} phone
   * @param {object} options
   * @param {boolean} options.includeSecrets - Whether to include hidden fields (otpHash, refreshToken, passwordHash)
   * @returns {Promise<import('./auth.model')|null>}
   */
  async findByPhone(phone, { includeSecrets = false } = {}) {
    const query = Auth.findOne({ phone });
    if (includeSecrets) {
      query.select('+otpHash +refreshToken +passwordHash');
    }
    return query.exec();
  }

  /**
   * Find an auth record by userId
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {object} options
   * @param {boolean} options.includeSecrets - Whether to include hidden fields
   * @returns {Promise<import('./auth.model')|null>}
   */
  async findByUserId(userId, { includeSecrets = false } = {}) {
    const query = Auth.findOne({ userId });
    if (includeSecrets) {
      query.select('+otpHash +refreshToken +passwordHash');
    }
    return query.exec();
  }

  /**
   * Find an auth record by refresh token
   * @param {string} refreshToken
   * @returns {Promise<import('./auth.model')|null>}
   */
  async findByRefreshToken(refreshToken) {
    return Auth.findOne({ refreshToken }).select('+refreshToken').exec();
  }

  /**
   * Create a new authentication document
   * @param {object} authData
   * @returns {Promise<import('./auth.model')>}
   */
  async createAuth(authData) {
    return Auth.create(authData);
  }

  /**
   * Update OTP details for a phone number
   * @param {string} phone
   * @param {object} otpDetails
   * @returns {Promise<import('./auth.model')|null>}
   */
  async updateOtp(phone, otpDetails) {
    return Auth.findOneAndUpdate(
      { phone },
      {
        $set: {
          otpHash: otpDetails.otpHash,
          otpExpiresAt: otpDetails.otpExpiresAt,
          otpAttempts: otpDetails.otpAttempts ?? 0,
          otpLastRequestedAt: otpDetails.otpLastRequestedAt,
          otpRequestCount: otpDetails.otpRequestCount,
          otpWindowStartAt: otpDetails.otpWindowStartAt,
        },
      },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Atomically increment failed OTP verification attempts
   * @param {string} phone
   * @returns {Promise<import('./auth.model')|null>}
   */
  async incrementOtpAttempts(phone) {
    return Auth.findOneAndUpdate(
      { phone },
      { $inc: { otpAttempts: 1 } },
      { new: true }
    ).exec();
  }

  /**
   * Clear OTP data (e.g. after successful verification or expiration lock)
   * @param {string} phone
   * @returns {Promise<import('./auth.model')|null>}
   */
  async clearOtp(phone) {
    return Auth.findOneAndUpdate(
      { phone },
      {
        $set: {
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Mark phone verified, store refresh token session, and update last login time
   * @param {string} phone
   * @param {object} sessionData
   * @returns {Promise<import('./auth.model')|null>}
   */
  async verifyPhoneAndSetSession(phone, { refreshToken, lastLoginAt }) {
    return Auth.findOneAndUpdate(
      { phone },
      {
        $set: {
          isPhoneVerified: true,
          refreshToken,
          lastLoginAt,
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Save or update refresh token for a user
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {string|null} refreshToken
   * @returns {Promise<import('./auth.model')|null>}
   */
  async updateRefreshToken(userId, refreshToken) {
    return Auth.findOneAndUpdate(
      { userId },
      { $set: { refreshToken } },
      { new: true }
    ).exec();
  }

  /**
   * Remove refresh token by token value (Logout)
   * @param {string} refreshToken
   * @returns {Promise<import('./auth.model')|null>}
   */
  async clearRefreshToken(refreshToken) {
    return Auth.findOneAndUpdate(
      { refreshToken },
      { $set: { refreshToken: null } },
      { new: true }
    ).exec();
  }

  /**
   * Clear refresh token by userId (Logout / Revoke all)
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./auth.model')|null>}
   */
  async clearRefreshTokenByUserId(userId) {
    return Auth.findOneAndUpdate(
      { userId },
      { $set: { refreshToken: null } },
      { new: true }
    ).exec();
  }

  /**
   * Update account status (e.g. ACTIVE, BLOCKED, SUSPENDED)
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {string} accountStatus
   * @returns {Promise<import('./auth.model')|null>}
   */
  async updateAccountStatus(userId, accountStatus) {
    return Auth.findOneAndUpdate(
      { userId },
      { $set: { accountStatus } },
      { new: true, runValidators: true }
    ).exec();
  }
}

module.exports = new AuthRepository();
