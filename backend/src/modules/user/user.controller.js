const { userService, AppError } = require('./user.service');

/**
 * User Controller
 *
 * Handles incoming HTTP requests for user profile operations, extracts
 * the authenticated user identity from request context, delegates to
 * UserService, and formats responses.
 *
 * Contains zero direct database queries or business logic.
 */
class UserController {
  /**
   * GET /api/users/profile
   * Fetch current authenticated user's profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const profile = await userService.getProfile(userId);

      return res.status(200).json({
        success: true,
        message: 'Profile fetched successfully',
        data: profile,
      });
    } catch (error) {
      return UserController.handleError(res, error);
    }
  }

  /**
   * PUT /api/users/profile
   * Update current authenticated user's profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const updatedProfile = await userService.updateProfile(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile,
      });
    } catch (error) {
      return UserController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/users/account
   * Safe account deactivation for current user
   */
  async deactivateAccount(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const result = await userService.deactivateAccount(userId);

      return res.status(200).json({
        success: true,
        message: result.message || 'Account deactivated successfully',
        data: {},
      });
    } catch (error) {
      return UserController.handleError(res, error);
    }
  }

  /**
   * PUT /api/users/profile-image
   * Update current authenticated user's profile image
   */
  async updateProfileImage(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const updatedProfile = await userService.updateProfileImage(userId, req.body.profileImage);

      return res.status(200).json({
        success: true,
        message: 'Profile image updated successfully',
        data: updatedProfile,
      });
    } catch (error) {
      return UserController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error response formatter
   * Preserves application error details while guarding against leaking DB stack traces
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    console.error('[UserController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new UserController();
