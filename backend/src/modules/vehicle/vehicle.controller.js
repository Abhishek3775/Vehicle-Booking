const { vehicleService, AppError } = require('./vehicle.service');

/**
 * Vehicle Controller
 *
 * Handles HTTP requests for customer vehicle management.
 * Extracts authenticated identity from request context, delegates to VehicleService,
 * and formats consistent API responses.
 *
 * Contains zero direct database access or business logic.
 */
class VehicleController {
  /**
   * POST /api/vehicles
   * Add a new vehicle for the authenticated user
   */
  async addVehicle(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const vehicle = await vehicleService.addVehicle(userId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Vehicle added successfully',
        data: vehicle,
      });
    } catch (error) {
      return VehicleController.handleError(res, error);
    }
  }

  /**
   * GET /api/vehicles
   * Retrieve all active vehicles owned by the authenticated user
   */
  async getUserVehicles(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const vehicles = await vehicleService.getUserVehicles(userId);

      return res.status(200).json({
        success: true,
        message: 'Vehicles fetched successfully',
        data: vehicles,
      });
    } catch (error) {
      return VehicleController.handleError(res, error);
    }
  }

  /**
   * GET /api/vehicles/:vehicleId
   * Retrieve single vehicle by ID ensuring user ownership
   */
  async getVehicleById(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { vehicleId } = req.params;
      const vehicle = await vehicleService.getVehicleById(userId, vehicleId);

      return res.status(200).json({
        success: true,
        message: 'Vehicle fetched successfully',
        data: vehicle,
      });
    } catch (error) {
      return VehicleController.handleError(res, error);
    }
  }

  /**
   * PUT /api/vehicles/:vehicleId
   * Update an existing vehicle owned by the authenticated user
   */
  async updateVehicle(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { vehicleId } = req.params;
      const updatedVehicle = await vehicleService.updateVehicle(userId, vehicleId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Vehicle updated successfully',
        data: updatedVehicle,
      });
    } catch (error) {
      return VehicleController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/vehicles/:vehicleId
   * Safely deactivate (soft-delete) a vehicle
   */
  async deactivateVehicle(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { vehicleId } = req.params;
      const result = await vehicleService.deactivateVehicle(userId, vehicleId);

      return res.status(200).json({
        success: true,
        message: result.message || 'Vehicle deleted successfully',
        data: {},
      });
    } catch (error) {
      return VehicleController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/vehicles/:vehicleId/default
   * Designate a vehicle as the user's default vehicle
   */
  async setDefaultVehicle(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { vehicleId } = req.params;
      const updatedVehicle = await vehicleService.setDefaultVehicle(userId, vehicleId);

      return res.status(200).json({
        success: true,
        message: 'Default vehicle updated successfully',
        data: updatedVehicle,
      });
    } catch (error) {
      return VehicleController.handleError(res, error);
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

    console.error('[VehicleController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new VehicleController();
