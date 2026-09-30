const { servicePackageService, AppError } = require('./servicePackage.service');

/**
 * Service Package Controller
 *
 * Handles incoming HTTP requests for service package catalogues.
 * Formats API responses and coordinates between user authorization contexts and ServicePackageService.
 *
 * Contains zero direct database queries or business logic.
 */
class ServicePackageController {
  /**
   * POST /api/service-packages
   * Create a new service package (Admin only)
   */
  async createPackage(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const servicePackage = await servicePackageService.createPackage(adminUserId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Service package created successfully',
        data: servicePackage,
      });
    } catch (error) {
      return ServicePackageController.handleError(res, error);
    }
  }

  /**
   * GET /api/service-packages
   * Retrieve list of service packages with filtering, search, and pagination
   * Public or authenticated customer
   */
  async getPackages(req, res) {
    try {
      const userRole = req.user?.role || null;
      const result = await servicePackageService.getPackages({
        query: req.query,
        userRole,
      });

      return res.status(200).json({
        success: true,
        message: 'Service packages fetched successfully',
        data: result.packages,
        pagination: result.pagination,
      });
    } catch (error) {
      return ServicePackageController.handleError(res, error);
    }
  }

  /**
   * GET /api/service-packages/:packageId
   * Retrieve service package details by ID
   * Public or authenticated customer (inactive packages hidden from non-admins)
   */
  async getPackageById(req, res) {
    try {
      const userRole = req.user?.role || null;
      const { packageId } = req.params;
      const servicePackage = await servicePackageService.getPackageById(packageId, userRole);

      return res.status(200).json({
        success: true,
        message: 'Service package fetched successfully',
        data: servicePackage,
      });
    } catch (error) {
      return ServicePackageController.handleError(res, error);
    }
  }

  /**
   * PUT /api/service-packages/:packageId
   * Update service package catalogue entry (Admin only)
   */
  async updatePackage(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { packageId } = req.params;
      const updatedPackage = await servicePackageService.updatePackage(
        packageId,
        adminUserId,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: 'Service package updated successfully',
        data: updatedPackage,
      });
    } catch (error) {
      return ServicePackageController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/service-packages/:packageId/status
   * Activate or deactivate service package (Admin only)
   */
  async updatePackageStatus(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { packageId } = req.params;
      const updatedPackage = await servicePackageService.updatePackageStatus(
        packageId,
        adminUserId,
        req.body.status
      );

      return res.status(200).json({
        success: true,
        message: 'Service package status updated successfully',
        data: updatedPackage,
      });
    } catch (error) {
      return ServicePackageController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/service-packages/:packageId
   * Safely deactivate (soft-delete) service package (Admin only)
   */
  async deactivatePackage(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { packageId } = req.params;
      const result = await servicePackageService.deactivatePackage(packageId, adminUserId);

      return res.status(200).json({
        success: true,
        message: result.message || 'Service package deactivated successfully',
        data: {},
      });
    } catch (error) {
      return ServicePackageController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error response formatter
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    console.error('[ServicePackageController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new ServicePackageController();
