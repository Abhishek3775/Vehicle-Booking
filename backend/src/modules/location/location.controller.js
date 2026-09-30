const { locationService, AppError } = require('./location.service');

/**
 * Location Controller Layer
 *
 * Handles HTTP requests for customer and mechanic geospatial data.
 * Extracts context from authenticated requests, validates authorization,
 * delegates to LocationService, and formats structured responses.
 */
class LocationController {
  /**
   * POST /api/locations/current
   * Update or set current GPS location for the authenticated customer
   */
  async updateCustomerCurrentLocation(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const location = await locationService.updateCustomerCurrentLocation(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Current location updated successfully',
        data: location,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * GET /api/locations/current
   * Retrieve current GPS location of the authenticated customer
   */
  async getCustomerCurrentLocation(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const location = await locationService.getCustomerCurrentLocation(userId);

      return res.status(200).json({
        success: true,
        message: 'Current location fetched successfully',
        data: location,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * GET /api/locations/history
   * Retrieve paginated location history for the authenticated customer
   */
  async getCustomerLocationHistory(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { page, limit, startDate, endDate } = req.query;
      const result = await locationService.getCustomerLocationHistory(userId, {
        page,
        limit,
        startDate,
        endDate,
      });

      return res.status(200).json({
        success: true,
        message: 'Location history fetched successfully',
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/locations/history
   * Clear historical location data for the authenticated customer
   */
  async clearCustomerLocationHistory(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const result = await locationService.clearCustomerLocationHistory(userId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: { deletedCount: result.deletedCount },
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * POST /api/locations/mechanic/current
   * Update current GPS location for the authenticated mechanic
   */
  async updateMechanicCurrentLocation(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const location = await locationService.updateMechanicCurrentLocation(userId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Mechanic location updated successfully',
        data: location,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * GET /api/locations/mechanic/current
   * Retrieve current GPS location for the authenticated mechanic
   */
  async getMechanicCurrentLocationSelf(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const location = await locationService.getMechanicCurrentLocationSelf(userId);

      return res.status(200).json({
        success: true,
        message: 'Current mechanic location fetched successfully',
        data: location,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * GET /api/locations/mechanics/:mechanicId
   * Retrieve latest location of a specific mechanic (Admin or self only)
   */
  async getMechanicCurrentLocationById(req, res) {
    try {
      const { mechanicId } = req.params;
      const location = await locationService.getMechanicCurrentLocationById(mechanicId, req.user);

      return res.status(200).json({
        success: true,
        message: 'Mechanic location fetched successfully',
        data: location,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * GET /api/locations/mechanics/nearby
   * Find nearby eligible mechanics within a given geographic radius
   */
  async getNearbyMechanics(req, res) {
    try {
      const { latitude, longitude, radius } = req.query;
      const mechanics = await locationService.getNearbyMechanics({
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusKm: Number(radius),
      });

      return res.status(200).json({
        success: true,
        message: 'Nearby mechanics fetched successfully',
        data: mechanics,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * POST /api/locations/distance
   * Calculate straight-line distance between origin and destination coordinates
   */
  async calculateDistance(req, res) {
    try {
      const { origin, destination } = req.body;
      const distance = locationService.calculateDistanceBetweenPoints(origin, destination);

      return res.status(200).json({
        success: true,
        message: 'Distance calculated successfully',
        data: distance,
      });
    } catch (error) {
      return LocationController.handleError(res, error);
    }
  }

  /**
   * Centralized HTTP error handler for LocationController
   */
  static handleError(res, error) {
    if (error instanceof AppError || error.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: error.details || {},
      });
    }

    console.error('[LocationController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new LocationController();
