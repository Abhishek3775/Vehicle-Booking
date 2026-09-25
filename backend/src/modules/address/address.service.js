const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const addressRepository = require('./address.repository');
const {
  ADDRESS_LABELS,
  ADDRESS_TYPES,
  ADDRESS_STATUS,
} = require('./address.constants');

/**
 * Address Service
 *
 * Implements business logic for user saved addresses:
 * - Adding addresses with automatic first-address default assignment
 * - Strict user ownership enforcement across all operations
 * - Atomic default address switching
 * - Safe soft deletion (deactivation) with automatic fallback default promotion
 */
class AddressService {
  /**
   * Format Address Mongoose document into standardized API response structure
   * @param {import('./address.model')} address
   * @returns {object}
   */
  formatAddressResponse(address) {
    return {
      id: address._id.toString(),
      userId: address.userId.toString(),
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      addressType: address.addressType,
      isDefault: Boolean(address.isDefault),
      status: address.status,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @throws {AppError}
   */
  assertValidObjectId(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid address ID format.', 400);
    }
  }

  /**
   * Normalize phone number
   * @param {string} phone
   * @returns {string}
   */
  normalizePhone(phone) {
    if (typeof phone !== 'string') return '';
    return phone.replace(/[\s-]/g, '').trim();
  }

  /**
   * Normalize postal code
   * @param {string} postalCode
   * @returns {string}
   */
  normalizePostalCode(postalCode) {
    if (typeof postalCode !== 'string') return '';
    return postalCode.replace(/[\s-]/g, '').toUpperCase().trim();
  }

  /**
   * Add a new saved address for the authenticated user
   * @param {string} userId
   * @param {object} addressData
   * @returns {Promise<object>}
   */
  async addAddress(userId, addressData) {
    // 1. Check if user currently has any active addresses
    const activeAddressCount = await addressRepository.countActiveByUserId(userId);

    // Default address rule:
    // First address is automatically default.
    // If client explicitly requests default on an additional address, clear previous defaults.
    let isDefault = false;
    if (activeAddressCount === 0) {
      isDefault = true;
    } else if (addressData.isDefault === true) {
      await addressRepository.clearDefaultAddresses(userId);
      isDefault = true;
    }

    // 2. Prepare sanitized address payload
    const payload = {
      userId,
      label: addressData.label ? addressData.label.toUpperCase().trim() : ADDRESS_LABELS.HOME,
      fullName: addressData.fullName.trim(),
      phone: this.normalizePhone(addressData.phone),
      addressLine1: addressData.addressLine1.trim(),
      addressLine2: addressData.addressLine2 ? addressData.addressLine2.trim() : '',
      landmark: addressData.landmark ? addressData.landmark.trim() : '',
      city: addressData.city.trim(),
      state: addressData.state.trim(),
      country: addressData.country ? addressData.country.trim() : 'India',
      postalCode: this.normalizePostalCode(addressData.postalCode),
      latitude: addressData.latitude !== undefined && addressData.latitude !== null ? Number(addressData.latitude) : null,
      longitude: addressData.longitude !== undefined && addressData.longitude !== null ? Number(addressData.longitude) : null,
      addressType: addressData.addressType ? addressData.addressType.toUpperCase().trim() : ADDRESS_TYPES.RESIDENTIAL,
      isDefault,
      status: ADDRESS_STATUS.ACTIVE,
    };

    const newAddress = await addressRepository.create(payload);
    return this.formatAddressResponse(newAddress);
  }

  /**
   * Retrieve all active saved addresses belonging to the authenticated user
   * @param {string} userId
   * @returns {Promise<Array<object>>}
   */
  async getUserAddresses(userId) {
    const addresses = await addressRepository.findByUserId(userId, {
      status: ADDRESS_STATUS.ACTIVE,
    });

    return addresses.map((addr) => this.formatAddressResponse(addr));
  }

  /**
   * Retrieve a single address by ID ensuring strict user ownership
   * @param {string} userId
   * @param {string} addressId
   * @returns {Promise<object>}
   */
  async getAddressById(userId, addressId) {
    this.assertValidObjectId(addressId);

    const address = await addressRepository.findById(addressId);
    if (!address) {
      throw new AppError('Address not found.', 404);
    }

    // Strict ownership verification
    if (address.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to access this address.', 403);
    }

    return this.formatAddressResponse(address);
  }

  /**
   * Update an existing address owned by the authenticated user
   * @param {string} userId
   * @param {string} addressId
   * @param {object} updateData
   * @returns {Promise<object>}
   */
  async updateAddress(userId, addressId, updateData) {
    this.assertValidObjectId(addressId);

    const address = await addressRepository.findById(addressId);
    if (!address) {
      throw new AppError('Address not found.', 404);
    }

    // Strict ownership verification
    if (address.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to modify this address.', 403);
    }

    if (address.status === ADDRESS_STATUS.INACTIVE) {
      throw new AppError('Cannot update an inactive address.', 400);
    }

    const payload = {};

    if (updateData.label !== undefined) {
      payload.label = updateData.label.toUpperCase().trim();
    }
    if (updateData.fullName !== undefined) {
      payload.fullName = updateData.fullName.trim();
    }
    if (updateData.phone !== undefined) {
      payload.phone = this.normalizePhone(updateData.phone);
    }
    if (updateData.addressLine1 !== undefined) {
      payload.addressLine1 = updateData.addressLine1.trim();
    }
    if (updateData.addressLine2 !== undefined) {
      payload.addressLine2 = updateData.addressLine2 ? updateData.addressLine2.trim() : '';
    }
    if (updateData.landmark !== undefined) {
      payload.landmark = updateData.landmark ? updateData.landmark.trim() : '';
    }
    if (updateData.city !== undefined) {
      payload.city = updateData.city.trim();
    }
    if (updateData.state !== undefined) {
      payload.state = updateData.state.trim();
    }
    if (updateData.country !== undefined) {
      payload.country = updateData.country.trim();
    }
    if (updateData.postalCode !== undefined) {
      payload.postalCode = this.normalizePostalCode(updateData.postalCode);
    }
    if (updateData.latitude !== undefined) {
      payload.latitude = updateData.latitude !== null ? Number(updateData.latitude) : null;
    }
    if (updateData.longitude !== undefined) {
      payload.longitude = updateData.longitude !== null ? Number(updateData.longitude) : null;
    }
    if (updateData.addressType !== undefined) {
      payload.addressType = updateData.addressType.toUpperCase().trim();
    }

    const updatedAddress = await addressRepository.updateById(addressId, payload);
    return this.formatAddressResponse(updatedAddress);
  }

  /**
   * Safely deactivate (soft-delete) an address
   * If the address was the default, automatically promotes another active address if one exists
   * @param {string} userId
   * @param {string} addressId
   * @returns {Promise<{ message: string }>}
   */
  async deactivateAddress(userId, addressId) {
    this.assertValidObjectId(addressId);

    const address = await addressRepository.findById(addressId);
    if (!address) {
      throw new AppError('Address not found.', 404);
    }

    // Strict ownership verification
    if (address.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to delete this address.', 403);
    }

    if (address.status === ADDRESS_STATUS.INACTIVE) {
      throw new AppError('Address is already inactive.', 400);
    }

    const wasDefault = address.isDefault;

    // Soft delete address
    await addressRepository.deactivateById(addressId);

    // If default address was deactivated, promote another active address to default if available
    if (wasDefault) {
      const fallbackAddress = await addressRepository.findFirstActiveByUserId(userId);
      if (fallbackAddress) {
        await addressRepository.setDefaultAddress(fallbackAddress._id, userId);
      }
    }

    return { message: 'Address deleted successfully.' };
  }

  /**
   * Set an address as the user's default address
   * Automatically clears default flag from user's other addresses
   * @param {string} userId
   * @param {string} addressId
   * @returns {Promise<object>}
   */
  async setDefaultAddress(userId, addressId) {
    this.assertValidObjectId(addressId);

    const address = await addressRepository.findById(addressId);
    if (!address) {
      throw new AppError('Address not found.', 404);
    }

    // Strict ownership verification
    if (address.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to modify this address.', 403);
    }

    if (address.status === ADDRESS_STATUS.INACTIVE) {
      throw new AppError('Cannot set an inactive address as default.', 400);
    }

    if (address.isDefault) {
      return this.formatAddressResponse(address);
    }

    const updatedAddress = await addressRepository.setDefaultAddress(addressId, userId);
    return this.formatAddressResponse(updatedAddress);
  }
}

module.exports = {
  AddressService,
  AppError,
  addressService: new AddressService(),
};
