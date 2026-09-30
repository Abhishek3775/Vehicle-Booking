const adminService = require('./admin.service');
const { AppError } = require('../auth/auth.service');

/**
 * Admin Controller
 *
 * Handles HTTP requests for the administrative panel without direct MongoDB access.
 */
class AdminController {
  /**
   * GET /api/admin/profile
   * Retrieve profile of authenticated administrator
   */
  async getProfile(req, res) {
    try {
      const adminUserId = req.user.userId || req.user.id;
      const profile = await adminService.getAdminProfile(adminUserId);

      return res.status(200).json({
        success: true,
        message: 'Admin profile fetched successfully',
        data: profile,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * PUT /api/admin/profile
   * Update profile of authenticated administrator
   */
  async updateProfile(req, res) {
    try {
      const adminUserId = req.user.userId || req.user.id;
      const profile = await adminService.updateAdminProfile(adminUserId, req.body, req);

      return res.status(200).json({
        success: true,
        message: 'Admin profile updated successfully',
        data: profile,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/dashboard
   * Retrieve platform high-level statistics and revenue summary
   */
  async getDashboard(req, res) {
    try {
      const summary = await adminService.getDashboardSummary();

      return res.status(200).json({
        success: true,
        message: 'Dashboard metrics fetched successfully',
        data: summary,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/dashboard/bookings
   * Retrieve periodic booking trends
   */
  async getBookingAnalytics(req, res) {
    try {
      const analytics = await adminService.getBookingAnalytics(req.query);

      return res.status(200).json({
        success: true,
        message: 'Booking analytics fetched successfully',
        data: analytics,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/dashboard/revenue
   * Calculate revenue from successful payments
   */
  async getRevenueAnalytics(req, res) {
    try {
      const revenue = await adminService.getRevenueAnalytics(req.query);

      return res.status(200).json({
        success: true,
        message: 'Revenue analytics fetched successfully',
        data: revenue,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/dashboard/mechanics
   * Retrieve mechanic platform statistics
   */
  async getMechanicAnalytics(req, res) {
    try {
      const stats = await adminService.getMechanicsAnalytics();

      return res.status(200).json({
        success: true,
        message: 'Mechanic metrics fetched successfully',
        data: stats,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/users
   * Retrieve list of platform users with pagination and search
   */
  async getUsers(req, res) {
    try {
      const result = await adminService.getUsersList({ query: req.query });

      return res.status(200).json({
        success: true,
        message: 'Users fetched successfully',
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/users/:userId
   * Retrieve single user details and relations
   */
  async getUserDetails(req, res) {
    try {
      const { userId } = req.params;
      const user = await adminService.getUserDetails(userId);

      return res.status(200).json({
        success: true,
        message: 'User details fetched successfully',
        data: user,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/admin/users/:userId/status
   * Update user account status
   */
  async updateUserStatus(req, res) {
    try {
      const adminUserId = req.user.userId || req.user.id;
      const { userId } = req.params;
      const result = await adminService.updateUserStatus(userId, req.body, adminUserId, req);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/mechanics
   * List platform mechanics with filters
   */
  async getMechanics(req, res) {
    try {
      const result = await adminService.getMechanicsList({ query: req.query });

      return res.status(200).json({
        success: true,
        message: 'Mechanics fetched successfully',
        data: result.mechanics,
        pagination: result.pagination,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/mechanics/:mechanicId
   * Retrieve mechanic profile details
   */
  async getMechanicDetails(req, res) {
    try {
      const { mechanicId } = req.params;
      const mechanic = await adminService.getMechanicDetails(mechanicId);

      return res.status(200).json({
        success: true,
        message: 'Mechanic details fetched successfully',
        data: mechanic,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/admin/mechanics/:mechanicId/verification
   * Update mechanic verification status
   */
  async updateMechanicVerification(req, res) {
    try {
      const adminUserId = req.user.userId || req.user.id;
      const { mechanicId } = req.params;
      const result = await adminService.updateMechanicVerification(
        mechanicId,
        req.body,
        adminUserId,
        req
      );

      return res.status(200).json({
        success: true,
        message: 'Mechanic verification status updated successfully',
        data: result,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/bookings
   * List platform bookings with filters
   */
  async getBookings(req, res) {
    try {
      const result = await adminService.getBookingsList({ query: req.query });

      return res.status(200).json({
        success: true,
        message: 'Bookings fetched successfully',
        data: result.bookings,
        pagination: result.pagination,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/bookings/:bookingId
   * Retrieve full booking overview with related inspection, quotation, payment, invoice
   */
  async getBookingDetails(req, res) {
    try {
      const { bookingId } = req.params;
      const details = await adminService.getBookingDetails(bookingId);

      return res.status(200).json({
        success: true,
        message: 'Booking details fetched successfully',
        data: details,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/admin/bookings/:bookingId/cancel
   * Cancel a booking as Administrator
   */
  async cancelBooking(req, res) {
    try {
      const adminUserId = req.user.userId || req.user.id;
      const { bookingId } = req.params;
      const result = await adminService.cancelBooking(bookingId, req.body, adminUserId, req);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/audit-logs
   * Retrieve administrative audit logs
   */
  async getAuditLogs(req, res) {
    try {
      const result = await adminService.getAuditLogs({ query: req.query });

      return res.status(200).json({
        success: true,
        message: 'Audit logs fetched successfully',
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * GET /api/admin/search
   * Categorized multi-collection global search
   */
  async globalSearch(req, res) {
    try {
      const { q } = req.query;
      const results = await adminService.globalSearch(q);

      return res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: results,
      });
    } catch (error) {
      return AdminController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error response handler
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    console.error('[AdminController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new AdminController();
