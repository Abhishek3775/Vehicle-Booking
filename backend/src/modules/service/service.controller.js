const { serviceService, AppError } = require('./service.service');

/**
 * Service Controller
 *
 * Handles HTTP requests for the platform service catalogue.
 * Formats API responses and coordinates between authorization contexts and ServiceService.
 *
 * Contains zero direct database access or business logic.
 */
class ServiceController {
  /**
   * POST /api/services
   * Create a new service catalogue entry (Admin only)
   */
  async createService(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const service = await serviceService.createService(adminUserId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: service,
      });
    } catch (error) {
      return ServiceController.handleError(res, error);
    }
  }

  /**
   * GET /api/services
   * Retrieve list of services with filtering, search, and pagination
   * Public or customer authenticated
   */
  async getServices(req, res) {
    try {
      const userRole = req.user?.role || null;
      const result = await serviceService.getServices({
        query: req.query,
        userRole,
      });

      return res.status(200).json({
        success: true,
        message: 'Services fetched successfully',
        data: result.services,
        pagination: result.pagination,
      });
    } catch (error) {
      return ServiceController.handleError(res, error);
    }
  }

  /**
   * GET /api/services/:serviceId
   * Retrieve service details by ID
   * Public or customer authenticated (inactive hidden from non-admins)
   */
  async getServiceById(req, res) {
    try {
      const userRole = req.user?.role || null;
      const { serviceId } = req.params;
      const service = await serviceService.getServiceById(serviceId, userRole);

      return res.status(200).json({
        success: true,
        message: 'Service fetched successfully',
        data: service,
      });
    } catch (error) {
      return ServiceController.handleError(res, error);
    }
  }

  /**
   * PUT /api/services/:serviceId
   * Update service catalogue details (Admin only)
   */
  async updateService(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { serviceId } = req.params;
      const updatedService = await serviceService.updateService(serviceId, adminUserId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data: updatedService,
      });
    } catch (error) {
      return ServiceController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/services/:serviceId/status
   * Activate or deactivate service (Admin only)
   */
  async updateServiceStatus(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { serviceId } = req.params;
      const updatedService = await serviceService.updateServiceStatus(
        serviceId,
        adminUserId,
        req.body.status
      );

      return res.status(200).json({
        success: true,
        message: 'Service status updated successfully',
        data: updatedService,
      });
    } catch (error) {
      return ServiceController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/services/:serviceId
   * Safely deactivate (soft-delete) service (Admin only)
   */
  async deactivateService(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { serviceId } = req.params;
      const result = await serviceService.deactivateService(serviceId, adminUserId);

      return res.status(200).json({
        success: true,
        message: result.message || 'Service deactivated successfully',
        data: {},
      });
    } catch (error) {
      return ServiceController.handleError(res, error);
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

    console.error('[ServiceController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new ServiceController();
