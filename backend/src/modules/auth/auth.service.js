const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const authRepository = require('./auth.repository');
const { ROLES, ACCOUNT_STATUS, OTP_CONFIG } = require('./auth.constants');

/**
 * Custom application error with HTTP status code
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Service
 *
 * Implements core authentication business logic:
 * - OTP generation, hashing, rate limiting, and verification
 * - JWT issuance (access and refresh tokens), rotation, and verification
 * - First-time user onboarding and session management
 */
class AuthService {
  /**
   * Generate cryptographically secure 6-digit numeric OTP
   * @returns {string}
   */
  generateOtpCode() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Generate JWT Access Token
   * Contains only minimal non-sensitive identity data (userId, role)
   * @param {object} payload
   * @param {string} payload.userId
   * @param {string} payload.role
   * @returns {string}
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
        role: payload.role,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );
  }

  /**
   * Generate JWT Refresh Token
   * @param {object} payload
   * @param {string} payload.userId
   * @returns {string}
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        userId: payload.userId,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );
  }

  /**
   * Verify an access token
   * @param {string} token
   * @returns {object} Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Access token has expired', 401);
      }
      throw new AppError('Invalid access token', 401);
    }
  }

  /**
   * Verify a refresh token
   * @param {string} token
   * @returns {object} Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token has expired. Please log in again.', 401);
      }
      throw new AppError('Invalid refresh token. Please log in again.', 401);
    }
  }

  /**
   * Request OTP for a phone number
   * Handles rate limiting, cooldown, and secure storage of OTP hash
   * @param {string} phone
   * @returns {Promise<{ message: string, cooldownSeconds: number, debugOtp?: string }>}
   */
  async requestOtp(phone) {
    const now = new Date();

    // Fetch existing auth record or initialize new one
    let auth = await authRepository.findByPhone(phone, { includeSecrets: true });

    if (!auth) {
      // First-time visitor: create record
      auth = await authRepository.createAuth({
        phone,
        role: ROLES.CUSTOMER,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      });
    }

    // Account status validation
    if (auth.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      throw new AppError('This account has been deactivated. Please contact support.', 403);
    }
    if (auth.accountStatus === ACCOUNT_STATUS.BLOCKED) {
      throw new AppError('This account has been blocked. Please contact support.', 403);
    }
    if (auth.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      throw new AppError('This account is suspended. Please contact support.', 403);
    }

    // Rate limiting: 1. Cooldown check
    if (auth.otpLastRequestedAt) {
      const elapsedSeconds = Math.floor((now.getTime() - new Date(auth.otpLastRequestedAt).getTime()) / 1000);
      if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds = env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        throw new AppError(
          `Please wait ${remainingSeconds} second(s) before requesting another OTP.`,
          429,
          { retryAfter: remainingSeconds }
        );
      }
    }

    // Rate limiting: 2. Window-based request limit
    const windowMs = env.OTP_WINDOW_MINUTES * 60 * 1000;
    let requestCount = 1;
    let windowStart = now;

    if (auth.otpWindowStartAt) {
      const timeInWindow = now.getTime() - new Date(auth.otpWindowStartAt).getTime();
      if (timeInWindow < windowMs) {
        if (auth.otpRequestCount >= env.OTP_MAX_REQUESTS) {
          const waitMinutes = Math.ceil((windowMs - timeInWindow) / (60 * 1000));
          throw new AppError(
            `Too many OTP requests. Please wait ${waitMinutes} minute(s) before trying again.`,
            429,
            { retryAfterMinutes: waitMinutes }
          );
        }
        requestCount = (auth.otpRequestCount || 0) + 1;
        windowStart = auth.otpWindowStartAt;
      }
    }

    // Generate 6-digit OTP
    const otp = this.generateOtpCode();

    // Hash OTP using bcrypt (never store plain OTPs)
    const saltRounds = 10;
    const otpHash = await bcrypt.hash(otp, saltRounds);

    // Calculate expiry timestamp
    const otpExpiresAt = new Date(now.getTime() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store in database
    await authRepository.updateOtp(phone, {
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      otpLastRequestedAt: now,
      otpRequestCount: requestCount,
      otpWindowStartAt: windowStart,
    });

    // In development mode: log OTP to console and include in response for Postman testing
    const isDev = env.NODE_ENV !== 'production';
    if (isDev) {
      console.log(`\n========================================`);
      console.log(`[DEV OTP] Phone: ${phone} | OTP: ${otp}`);
      console.log(`[DEV OTP] Expires in: ${env.OTP_EXPIRY_MINUTES} minutes`);
      console.log(`========================================\n`);
    }

    return {
      message: 'OTP sent successfully to your phone number.',
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      expiresInMinutes: env.OTP_EXPIRY_MINUTES,
      ...(isDev && { debugOtp: otp }),
    };
  }

  /**
   * Verify OTP and authenticate user
   * Returns JWT access & refresh tokens along with core identity
   * @param {string} phone
   * @param {string} otp
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  async verifyOtp(phone, otp) {
    const auth = await authRepository.findByPhone(phone, { includeSecrets: true });

    if (!auth || !auth.otpHash || !auth.otpExpiresAt) {
      throw new AppError('No active OTP request found for this phone number. Please request an OTP.', 400);
    }

    // Account status check
    if (auth.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      throw new AppError('This account has been deactivated. Please contact support.', 403);
    }
    if (auth.accountStatus === ACCOUNT_STATUS.BLOCKED) {
      throw new AppError('This account has been blocked. Please contact support.', 403);
    }
    if (auth.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      throw new AppError('This account is suspended. Please contact support.', 403);
    }

    // Check expiration
    const now = new Date();
    if (now > new Date(auth.otpExpiresAt)) {
      await authRepository.clearOtp(phone);
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    // Check brute-force attempts
    if (auth.otpAttempts >= OTP_CONFIG.MAX_VERIFY_ATTEMPTS) {
      await authRepository.clearOtp(phone);
      throw new AppError(
        'Maximum OTP verification attempts exceeded. Please request a new OTP.',
        429
      );
    }

    // Verify OTP against stored hash
    const isOtpValid = await bcrypt.compare(otp, auth.otpHash);
    if (!isOtpValid) {
      await authRepository.incrementOtpAttempts(phone);
      const remainingAttempts = OTP_CONFIG.MAX_VERIFY_ATTEMPTS - (auth.otpAttempts + 1);

      if (remainingAttempts <= 0) {
        await authRepository.clearOtp(phone);
        throw new AppError('Invalid OTP. Maximum attempts exceeded. Please request a new OTP.', 400);
      }

      throw new AppError(
        `Invalid OTP. You have ${remainingAttempts} attempt(s) remaining.`,
        400
      );
    }

    // Determine if this is a first-time login
    const isNewUser = !auth.isPhoneVerified;

    // Issue JWT access and refresh tokens
    const accessToken = this.generateAccessToken({
      userId: auth.userId.toString(),
      role: auth.role,
    });

    const refreshToken = this.generateRefreshToken({
      userId: auth.userId.toString(),
    });

    // Mark phone verified, store active session refresh token, clear OTP
    const updatedAuth = await authRepository.verifyPhoneAndSetSession(phone, {
      refreshToken,
      lastLoginAt: now,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: updatedAuth.userId,
        phone: updatedAuth.phone,
        role: updatedAuth.role,
        accountStatus: updatedAuth.accountStatus,
        isPhoneVerified: updatedAuth.isPhoneVerified,
        isNewUser,
        lastLoginAt: updatedAuth.lastLoginAt,
      },
    };
  }

  /**
   * Refresh JWT access token using a valid refresh token
   * Follows token rotation for enhanced security
   * @param {string} incomingRefreshToken
   * @returns {Promise<{ accessToken: string, refreshToken: string }>}
   */
  async refreshToken(incomingRefreshToken) {
    // 1. Verify token signature and expiration
    const decoded = this.verifyRefreshToken(incomingRefreshToken);

    // 2. Locate auth record that owns this active refresh token
    const auth = await authRepository.findByRefreshToken(incomingRefreshToken);

    if (!auth || auth.userId.toString() !== decoded.userId) {
      throw new AppError('Invalid or revoked refresh token. Please log in again.', 401);
    }

    // 3. Verify account status
    if (auth.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      throw new AppError(`Account is ${auth.accountStatus.toLowerCase()}. Access denied.`, 403);
    }

    // 4. Issue new access token and rotated refresh token
    const newAccessToken = this.generateAccessToken({
      userId: auth.userId.toString(),
      role: auth.role,
    });

    const newRefreshToken = this.generateRefreshToken({
      userId: auth.userId.toString(),
    });

    // 5. Update stored refresh token in DB
    await authRepository.updateRefreshToken(auth.userId, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Invalidate user session (Logout)
   * @param {object} params
   * @param {string} [params.refreshToken]
   * @param {string} [params.userId]
   * @returns {Promise<void>}
   */
  async logout({ refreshToken, userId }) {
    if (refreshToken) {
      await authRepository.clearRefreshToken(refreshToken);
    } else if (userId) {
      await authRepository.clearRefreshTokenByUserId(userId);
    }
  }
}

module.exports = {
  AuthService,
  AppError,
  authService: new AuthService(),
};
