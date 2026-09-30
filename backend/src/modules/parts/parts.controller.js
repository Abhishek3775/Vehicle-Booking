const { partsService, AppError } = require('./parts.service');

/**
 * Parts / Inventory Controller
 *
 * Handles HTTP requests for vehicle spare parts and inventory operations.
 * Coordinates between user authorization contexts and PartsService.
 * Contains zero direct database queries or business logic.
 */
class PartsController {
  /**
   * POST /api/parts
   * Create a new part catalogue entry (Admin only)
   */
  async createPart(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const part = await partsService.createPart(adminUserId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Part created successfully',
        data: part,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * GET /api/parts
   * Retrieve list of parts with filtering, search, and pagination
   */
  async getParts(req, res) {
    try {
      const userRole = req.user?.role || null;
      const result = await partsService.getParts({
        query: req.query,
        userRole,
      });

      return res.status(200).json({
        success: true,
        message: 'Parts fetched successfully',
        data: result.parts,
        pagination: result.pagination,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * GET /api/parts/:partId
   * Retrieve single part details by ID
   */
  async getPartById(req, res) {
    try {
      const userRole = req.user?.role || null;
      const { partId } = req.params;
      const part = await partsService.getPartById(partId, userRole);

      return res.status(200).json({
        success: true,
        message: 'Part fetched successfully',
        data: part,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * PUT /api/parts/:partId
   * Update part metadata (Admin only)
   */
  async updatePart(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { partId } = req.params;
      const updatedPart = await partsService.updatePart(partId, adminUserId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Part updated successfully',
        data: updatedPart,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/parts/:partId/status
   * Activate or deactivate part status (Admin only)
   */
  async updateStatus(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { partId } = req.params;
      const updatedPart = await partsService.updateStatus(
        partId,
        adminUserId,
        req.body.status
      );

      return res.status(200).json({
        success: true,
        message: 'Part status updated successfully',
        data: updatedPart,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/parts/:partId/stock
   * Adjust inventory stock quantity (ADD or REMOVE) (Admin only)
   */
  async updateStock(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { partId } = req.params;
      const updatedPart = await partsService.updateStock(
        partId,
        adminUserId,
        req.body
      );

      return res.status(200).json({
        success: true,
        message: 'Part stock updated successfully',
        data: updatedPart,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/parts/:partId/reserve
   * Reserve stock quantity for a part (Admin / Internal workflow)
   */
  async reserveStock(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { partId } = req.params;
      const updatedPart = await partsService.reserveStock(
        partId,
        adminUserId,
        req.body.quantity
      );

      return res.status(200).json({
        success: true,
        message: 'Stock reserved successfully',
        data: updatedPart,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/parts/:partId/release
   * Release reserved stock quantity (Admin / Internal workflow)
   */
  async releaseStock(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { partId } = req.params;
      const updatedPart = await partsService.releaseStock(
        partId,
        adminUserId,
        req.body.quantity
      );

      return res.status(200).json({
        success: true,
        message: 'Reserved stock released successfully',
        data: updatedPart,
      });
    } catch (error) {
      return PartsController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/parts/:partId
   * Safely deactivate (soft-delete) part (Admin only)
   */
  async deactivatePart(req, res) {
    try {
      const adminUserId = req.user?.userId || req.user?.id;
      const { partId } = req.params;
      const result = await partsService.deactivatePart(partId, adminUserId);

      return res.status(200).json({
        success: true,
        message: result.message || 'Part deactivated successfully',
        data: {},
      });
    } catch (error) {
      return PartsController.handleError(res, error);
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

    console.error('[PartsController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new PartsController();
