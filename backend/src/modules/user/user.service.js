const { AppError } = require('../auth/auth.service');
const userRepository = require('./user.repository');
const authRepository = require('../auth/auth.repository');
const { USER_ACCOUNT_STATUS, GENDERS } = require('./user.constants');

/**
 * User Service
 *
 * Implements business logic for user profiles, account management,
 * email verification checks, safe account deactivation, and profile images.
 */
class UserService {
  /**
   * Format User Mongoose document into standardized API response structure
   * @param {import('./user.model')} user
   * @returns {object}
   */
  formatProfileResponse(user) {
    return {
      id: user._id.toString(),
      userId: user.userId.toString(),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || null,
      profileImage: user.profileImage || null,
      gender: user.gender || null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      preferences: user.preferences || {},
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Fetch current user profile by authenticated userId
   * If profile does not exist yet (first-time authenticated user), initializes it automatically.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    let user = await userRepository.findByUserId(userId);

    // If profile does not exist in User collection, verify Auth identity and initialize
    if (!user) {
      const auth = await authRepository.findByUserId(userId);
      if (!auth) {
        throw new AppError('User account not found', 404);
      }

      // Check account status in Auth
      if (auth.accountStatus === USER_ACCOUNT_STATUS.DEACTIVATED) {
        throw new AppError('This account has been deactivated. Please contact support.', 403);
      }
      if (auth.accountStatus === USER_ACCOUNT_STATUS.BLOCKED) {
        throw new AppError('This account has been blocked. Please contact support.', 403);
      }
      if (auth.accountStatus === USER_ACCOUNT_STATUS.SUSPENDED) {
        throw new AppError('This account is suspended. Please contact support.', 403);
      }

      // Initialize default User profile linked to Auth
      user = await userRepository.createUser({
        userId: auth.userId,
        authId: auth._id,
        email: auth.email || null,
        accountStatus: auth.accountStatus || USER_ACCOUNT_STATUS.ACTIVE,
      });
    }

    // Verify User account status
    if (user.accountStatus === USER_ACCOUNT_STATUS.DEACTIVATED) {
      throw new AppError('This account has been deactivated. Please contact support.', 403);
    }
    if (user.accountStatus === USER_ACCOUNT_STATUS.BLOCKED) {
      throw new AppError('This account has been blocked. Please contact support.', 403);
    }
    if (user.accountStatus === USER_ACCOUNT_STATUS.SUSPENDED) {
      throw new AppError('This account is suspended. Please contact support.', 403);
    }

    return this.formatProfileResponse(user);
  }

  /**
   * Update profile fields for authenticated user
   * Only permits safe, non-sensitive profile attributes
   * @param {string} userId
   * @param {object} updateData
   * @returns {Promise<object>}
   */
  async updateProfile(userId, updateData) {
    let user = await userRepository.findByUserId(userId);

    if (!user) {
      const auth = await authRepository.findByUserId(userId);
      if (!auth) {
        throw new AppError('User account not found', 404);
      }
      user = await userRepository.createUser({
        userId: auth.userId,
        authId: auth._id,
        email: auth.email || null,
        accountStatus: auth.accountStatus || USER_ACCOUNT_STATUS.ACTIVE,
      });
    }

    // Ensure account is active
    if (user.accountStatus !== USER_ACCOUNT_STATUS.ACTIVE) {
      throw new AppError(`Account is ${user.accountStatus.toLowerCase()}. Profile cannot be updated.`, 403);
    }

    const payload = {};

    // 1. First & Last Name
    if (updateData.firstName !== undefined) {
      payload.firstName = typeof updateData.firstName === 'string' ? updateData.firstName.trim() : '';
    }
    if (updateData.lastName !== undefined) {
      payload.lastName = typeof updateData.lastName === 'string' ? updateData.lastName.trim() : '';
    }

    // 2. Email uniqueness & validation
    if (updateData.email !== undefined) {
      if (updateData.email === null || updateData.email === '') {
        payload.email = null;
      } else {
        const normalizedEmail = updateData.email.toLowerCase().trim();
        // If changed, check if already in use by another user
        if (normalizedEmail !== user.email) {
          const existingUserWithEmail = await userRepository.findByEmail(normalizedEmail);
          if (existingUserWithEmail && existingUserWithEmail.userId.toString() !== userId.toString()) {
            throw new AppError('The specified email is already in use by another account.', 409);
          }
          payload.email = normalizedEmail;
        }
      }
    }

    // 3. Gender
    if (updateData.gender !== undefined) {
      if (updateData.gender === null || updateData.gender === '') {
        payload.gender = null;
      } else {
        const normalizedGender = String(updateData.gender).toLowerCase().trim();
        if (!Object.values(GENDERS).includes(normalizedGender)) {
          throw new AppError(`Invalid gender. Allowed values: ${Object.values(GENDERS).join(', ')}`, 400);
        }
        payload.gender = normalizedGender;
      }
    }

    // 4. Date of Birth
    if (updateData.dateOfBirth !== undefined) {
      if (updateData.dateOfBirth === null || updateData.dateOfBirth === '') {
        payload.dateOfBirth = null;
      } else {
        const dob = new Date(updateData.dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw new AppError('Invalid date of birth format.', 400);
        }
        if (dob > new Date()) {
          throw new AppError('Date of birth cannot be in the future.', 400);
        }
        payload.dateOfBirth = dob;
      }
    }

    // 5. Preferences (deep merge with existing preferences)
    if (updateData.preferences !== undefined && typeof updateData.preferences === 'object') {
      payload.preferences = {
        ...(user.preferences || {}),
        ...updateData.preferences,
      };
    }

    // Persist updates
    const updatedUser = await userRepository.updateByUserId(userId, payload);
    return this.formatProfileResponse(updatedUser);
  }

  /**
   * Safe account deactivation
   * Marks account as DEACTIVATED in both User and Auth collections,
   * invalidates active sessions and refresh tokens.
   * @param {string} userId
   * @returns {Promise<{ message: string }>}
   */
  async deactivateAccount(userId) {
    let user = await userRepository.findByUserId(userId);

    if (!user) {
      const auth = await authRepository.findByUserId(userId);
      if (!auth) {
        throw new AppError('User account not found', 404);
      }
      user = await userRepository.createUser({
        userId: auth.userId,
        authId: auth._id,
        accountStatus: auth.accountStatus,
      });
    }

    if (user.accountStatus === USER_ACCOUNT_STATUS.DEACTIVATED) {
      throw new AppError('Account is already deactivated.', 400);
    }

    // 1. Deactivate User document
    await userRepository.deactivateByUserId(userId);

    // 2. Synchronize Auth collection and invalidate all active session tokens
    await authRepository.updateAccountStatus(userId, USER_ACCOUNT_STATUS.DEACTIVATED);
    await authRepository.clearRefreshTokenByUserId(userId);

    return { message: 'Account deactivated successfully. Active sessions have been revoked.' };
  }

  /**
   * Update profile image
   * Validates image source and updates user profile
   * Designed for seamless integration with Cloudinary/S3 storage providers
   * @param {string} userId
   * @param {string} imageUrl
   * @returns {Promise<object>}
   */
  async updateProfileImage(userId, imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      throw new AppError('Profile image URL or data is required.', 400);
    }

    let user = await userRepository.findByUserId(userId);

    if (!user) {
      const auth = await authRepository.findByUserId(userId);
      if (!auth) {
        throw new AppError('User account not found', 404);
      }
      user = await userRepository.createUser({
        userId: auth.userId,
        authId: auth._id,
        accountStatus: auth.accountStatus,
      });
    }

    if (user.accountStatus !== USER_ACCOUNT_STATUS.ACTIVE) {
      throw new AppError(`Account is ${user.accountStatus.toLowerCase()}. Cannot update profile image.`, 403);
    }

    const trimmedUrl = imageUrl.trim();
    const updatedUser = await userRepository.updateProfileImage(userId, trimmedUrl);

    return this.formatProfileResponse(updatedUser);
  }
}

module.exports = {
  UserService,
  AppError,
  userService: new UserService(),
};
