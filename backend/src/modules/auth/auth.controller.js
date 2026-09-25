const { authService, AppError } = require('./auth.service');

/**
 * Authentication Controller
 *
 * Handles HTTP requests, orchestrates calls to AuthService, and formats
 * standard API responses. Contains zero business logic or direct DB access.
 */
class AuthController {
  /**
   * POST /api/auth/request-otp
   * Request an OTP for phone authentication
   */
  async requestOtp(req, res) {
    try {
      const { phone } = req.body;
      const result = await authService.requestOtp(phone);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          phone,
          cooldownSeconds: result.cooldownSeconds,
          expiresInMinutes: result.expiresInMinutes,
          ...(result.debugOtp ? { debugOtp: result.debugOtp } : {}),
        },
      });
    } catch (error) {
      return AuthController.handleError(res, error);
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verify OTP and issue authentication tokens
   */
  async verifyOtp(req, res) {
    try {
      const { phone, otp } = req.body;
      const result = await authService.verifyOtp(phone, otp);

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully.',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        },
      });
    } catch (error) {
      return AuthController.handleError(res, error);
    }
  }

  /**
   * POST /api/auth/refresh-token
   * Refresh expired access token using refresh token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);

      return res.status(200).json({
        success: true,
        message: 'Access token refreshed successfully.',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      return AuthController.handleError(res, error);
    }
  }

  /**
   * POST /api/auth/logout
   * Invalidate active session and refresh token
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      let userId = null;

      // Extract user ID from optional Bearer token if provided
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = authService.verifyAccessToken(token);
          userId = decoded.userId;
        } catch {
          // Ignore token expiration on logout; fallback to refreshToken
        }
      }

      await authService.logout({ refreshToken, userId });

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully. Session invalidated.',
        data: {},
      });
    } catch (error) {
      return AuthController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error response formatter
   * Ensures internal database errors and stack traces are never exposed
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    // Generic internal error
    console.error('[AuthController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new AuthController();
