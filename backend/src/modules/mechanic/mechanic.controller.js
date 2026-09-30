const mechanicService = require('./mechanic.service');
const { AppError } = require('../auth/auth.service');

/**
 * Mechanic Controller
 *
 * Handles incoming HTTP requests for mechanic profiles, availability, location,
 * work status, and administrator verification workflows.
 * Extracts user context and coordinates with MechanicService.
 * Contains zero direct database queries.
 */
class MechanicController {
  /**
   * POST /api/mechanics
   * Create a new mechanic profile for a registered MECHANIC user (Admin only)
   */
  async createMechanic(req, res) {
    try {
      const authUser = req.user;
      const mechanic = await mechanicService.createMechanicProfile(req.body, authUser);

      return res.status(201).json({
        success: true,
        message: 'Mechanic profile created successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * GET /api/mechanics/me
   * Retrieve authenticated mechanic's own profile (Mechanic only)
   */
  async getMyProfile(req, res) {
    try {
      const authUser = req.user;
      const mechanic = await mechanicService.getMyProfile(authUser);

      return res.status(200).json({
        success: true,
        message: 'Mechanic profile fetched successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * GET /api/mechanics/:mechanicId
   * Retrieve single mechanic profile by ID
   */
  async getMechanicById(req, res) {
    try {
      const authUser = req.user;
      const { mechanicId } = req.params;
      const mechanic = await mechanicService.getMechanicById(mechanicId, authUser);

      return res.status(200).json({
        success: true,
        message: 'Mechanic details fetched successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * GET /api/mechanics
   * Search and filter mechanics with pagination (Admin only)
   */
  async getMechanicsList(req, res) {
    try {
      const authUser = req.user;
      const result = await mechanicService.getMechanicsList(req.query, authUser);

      return res.status(200).json({
        success: true,
        message: 'Mechanics fetched successfully',
        data: result.mechanics,
        pagination: result.pagination,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * PUT /api/mechanics/:mechanicId
   * Update mechanic profile (Self or Admin)
   */
  async updateMechanic(req, res) {
    try {
      const authUser = req.user;
      const { mechanicId } = req.params;
      const mechanic = await mechanicService.updateMechanicProfile(mechanicId, req.body, authUser);

      return res.status(200).json({
        success: true,
        message: 'Mechanic profile updated successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/mechanics/:mechanicId/availability
   * Update mechanic availability status (Self or Admin)
   */
  async updateAvailability(req, res) {
    try {
      const authUser = req.user;
      const { mechanicId } = req.params;
      const { availabilityStatus } = req.body;
      const mechanic = await mechanicService.updateAvailability(mechanicId, availabilityStatus, authUser);

      return res.status(200).json({
        success: true,
        message: 'Mechanic availability updated successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/mechanics/:mechanicId/work-status
   * Update mechanic work status (Self or Admin)
   */
  async updateWorkStatus(req, res) {
    try {
      const authUser = req.user;
      const { mechanicId } = req.params;
      const { workStatus } = req.body;
      const mechanic = await mechanicService.updateWorkStatus(mechanicId, workStatus, authUser);

      return res.status(200).json({
        success: true,
        message: 'Mechanic work status updated successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/mechanics/:mechanicId/location
   * Update mechanic current location coordinates (Self or Admin)
   */
  async updateLocation(req, res) {
    try {
      const authUser = req.user;
      const { mechanicId } = req.params;
      const { latitude, longitude } = req.body;
      const mechanic = await mechanicService.updateLocation(mechanicId, { latitude, longitude }, authUser);

      return res.status(200).json({
        success: true,
        message: 'Mechanic location updated successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/mechanics/:mechanicId/verification
   * Update mechanic verification status (Admin only)
   */
  async updateVerification(req, res) {
    try {
      const authUser = req.user;
      const { mechanicId } = req.params;
      const { verificationStatus, notes } = req.body;
      const mechanic = await mechanicService.updateVerificationStatus(
        mechanicId,
        { verificationStatus, notes },
        authUser
      );

      return res.status(200).json({
        success: true,
        message: 'Mechanic verification status updated successfully',
        data: mechanic,
      });
    } catch (error) {
      return MechanicController.handleError(res, error);
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

    console.error('[MechanicController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new MechanicController();
