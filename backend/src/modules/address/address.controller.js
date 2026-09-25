const { addressService, AppError } = require('./address.service');

/**
 * Address Controller
 *
 * Handles HTTP requests for user saved addresses.
 * Extracts authenticated identity from request context, delegates to AddressService,
 * and formats consistent API responses.
 *
 * Contains zero direct database access or business logic.
 */
class AddressController {
  /**
   * POST /api/addresses
   * Add a new saved address for the authenticated user
   */
  async addAddress(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const address = await addressService.addAddress(userId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: address,
      });
    } catch (error) {
      return AddressController.handleError(res, error);
    }
  }

  /**
   * GET /api/addresses
   * Retrieve all active saved addresses belonging to the authenticated user
   */
  async getUserAddresses(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const addresses = await addressService.getUserAddresses(userId);

      return res.status(200).json({
        success: true,
        message: 'Addresses fetched successfully',
        data: addresses,
      });
    } catch (error) {
      return AddressController.handleError(res, error);
    }
  }

  /**
   * GET /api/addresses/:addressId
   * Retrieve a single address by ID (requires ownership)
   */
  async getAddressById(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { addressId } = req.params;
      const address = await addressService.getAddressById(userId, addressId);

      return res.status(200).json({
        success: true,
        message: 'Address fetched successfully',
        data: address,
      });
    } catch (error) {
      return AddressController.handleError(res, error);
    }
  }

  /**
   * PUT /api/addresses/:addressId
   * Update an existing address (requires ownership)
   */
  async updateAddress(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { addressId } = req.params;
      const updatedAddress = await addressService.updateAddress(userId, addressId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: updatedAddress,
      });
    } catch (error) {
      return AddressController.handleError(res, error);
    }
  }

  /**
   * DELETE /api/addresses/:addressId
   * Safely deactivate (soft-delete) an address
   */
  async deactivateAddress(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { addressId } = req.params;
      const result = await addressService.deactivateAddress(userId, addressId);

      return res.status(200).json({
        success: true,
        message: result.message || 'Address deleted successfully',
        data: {},
      });
    } catch (error) {
      return AddressController.handleError(res, error);
    }
  }

  /**
   * PATCH /api/addresses/:addressId/default
   * Designate an address as the user's default address
   */
  async setDefaultAddress(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { addressId } = req.params;
      const updatedAddress = await addressService.setDefaultAddress(userId, addressId);

      return res.status(200).json({
        success: true,
        message: 'Default address updated successfully',
        data: updatedAddress,
      });
    } catch (error) {
      return AddressController.handleError(res, error);
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

    console.error('[AddressController Internal Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected internal error occurred. Please try again later.',
      error: {},
    });
  }
}

module.exports = new AddressController();
