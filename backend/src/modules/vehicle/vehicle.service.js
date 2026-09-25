const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const vehicleRepository = require('./vehicle.repository');
const {
  VEHICLE_TYPES,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_STATUS,
} = require('./vehicle.constants');

/**
 * Vehicle Service
 *
 * Implements business logic for customer vehicles:
 * - Adding vehicles with automatic first-vehicle default designation
 * - Enforcing strict ownership access controls
 * - Normalizing and enforcing registration number uniqueness
 * - Safe soft deletion (deactivation) and automatic default fallback
 * - Atomic default vehicle toggling
 */
class VehicleService {
  /**
   * Format Vehicle Mongoose document into standardized API response structure
   * @param {import('./vehicle.model')} vehicle
   * @returns {object}
   */
  formatVehicleResponse(vehicle) {
    return {
      id: vehicle._id.toString(),
      userId: vehicle.userId.toString(),
      vehicleType: vehicle.vehicleType,
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant || '',
      registrationNumber: vehicle.registrationNumber,
      registrationYear: vehicle.registrationYear,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission || null,
      color: vehicle.color || '',
      vinNumber: vehicle.vinNumber || null,
      odometerReading: vehicle.odometerReading ?? 0,
      isDefault: Boolean(vehicle.isDefault),
      status: vehicle.status,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  /**
   * Normalize vehicle registration number (strip spaces/hyphens and uppercase)
   * @param {string} regNum
   * @returns {string}
   */
  normalizeRegistrationNumber(regNum) {
    if (typeof regNum !== 'string') return '';
    return regNum.replace(/[\s-]/g, '').toUpperCase();
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @throws {AppError}
   */
  assertValidObjectId(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid vehicle ID format.', 400);
    }
  }

  /**
   * Add a new vehicle for the authenticated user
   * @param {string} userId
   * @param {object} vehicleData
   * @returns {Promise<object>}
   */
  async addVehicle(userId, vehicleData) {
    const normalizedReg = this.normalizeRegistrationNumber(vehicleData.registrationNumber);

    // 1. Check for duplicate active registration number across platform
    const existingVehicle = await vehicleRepository.findByRegistrationNumber(normalizedReg, {
      status: VEHICLE_STATUS.ACTIVE,
    });

    if (existingVehicle) {
      if (existingVehicle.userId.toString() === userId.toString()) {
        throw new AppError('You already have an active vehicle registered with this registration number.', 409);
      } else {
        throw new AppError('A vehicle with this registration number is already registered in the system.', 409);
      }
    }

    // 2. Check if user currently has any active vehicles
    const activeVehicleCount = await vehicleRepository.countActiveByUserId(userId);

    // Default vehicle rule:
    // First vehicle is automatically default.
    // If client explicitly requests default on an additional vehicle, clear previous defaults.
    let isDefault = false;
    if (activeVehicleCount === 0) {
      isDefault = true;
    } else if (vehicleData.isDefault === true) {
      await vehicleRepository.clearDefaultVehicles(userId);
      isDefault = true;
    }

    // 3. Prepare sanitized vehicle payload
    const payload = {
      userId,
      vehicleType: vehicleData.vehicleType,
      make: vehicleData.make.trim(),
      model: vehicleData.model.trim(),
      variant: vehicleData.variant ? vehicleData.variant.trim() : '',
      registrationNumber: normalizedReg,
      registrationYear: Number(vehicleData.registrationYear),
      fuelType: vehicleData.fuelType,
      transmission: vehicleData.transmission || null,
      color: vehicleData.color ? vehicleData.color.trim() : '',
      vinNumber: vehicleData.vinNumber ? vehicleData.vinNumber.trim().toUpperCase() : null,
      odometerReading: vehicleData.odometerReading ? Number(vehicleData.odometerReading) : 0,
      isDefault,
      status: VEHICLE_STATUS.ACTIVE,
    };

    const newVehicle = await vehicleRepository.create(payload);
    return this.formatVehicleResponse(newVehicle);
  }

  /**
   * Retrieve all active vehicles owned by the authenticated user
   * @param {string} userId
   * @returns {Promise<Array<object>>}
   */
  async getUserVehicles(userId) {
    const vehicles = await vehicleRepository.findByUserId(userId, {
      status: VEHICLE_STATUS.ACTIVE,
    });

    return vehicles.map((v) => this.formatVehicleResponse(v));
  }

  /**
   * Retrieve a single vehicle by ID ensuring strict user ownership
   * @param {string} userId
   * @param {string} vehicleId
   * @returns {Promise<object>}
   */
  async getVehicleById(userId, vehicleId) {
    this.assertValidObjectId(vehicleId);

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found.', 404);
    }

    // Strict ownership verification
    if (vehicle.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to access this vehicle.', 403);
    }

    return this.formatVehicleResponse(vehicle);
  }

  /**
   * Update an existing vehicle owned by the authenticated user
   * @param {string} userId
   * @param {string} vehicleId
   * @param {object} updateData
   * @returns {Promise<object>}
   */
  async updateVehicle(userId, vehicleId, updateData) {
    this.assertValidObjectId(vehicleId);

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found.', 404);
    }

    // Strict ownership verification
    if (vehicle.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to modify this vehicle.', 403);
    }

    // Inactive vehicle check
    if (vehicle.status === VEHICLE_STATUS.INACTIVE) {
      throw new AppError('Cannot update an inactive vehicle.', 400);
    }

    const payload = {};

    // 1. Make & Model
    if (updateData.make !== undefined) payload.make = updateData.make.trim();
    if (updateData.model !== undefined) payload.model = updateData.model.trim();
    if (updateData.variant !== undefined) payload.variant = updateData.variant.trim();

    // 2. Vehicle Type
    if (updateData.vehicleType !== undefined) payload.vehicleType = updateData.vehicleType;

    // 3. Registration Number (with duplicate check if changed)
    if (updateData.registrationNumber !== undefined) {
      const normalizedReg = this.normalizeRegistrationNumber(updateData.registrationNumber);
      if (normalizedReg !== vehicle.registrationNumber) {
        const existingVehicle = await vehicleRepository.findByRegistrationNumber(normalizedReg, {
          status: VEHICLE_STATUS.ACTIVE,
        });

        if (existingVehicle && existingVehicle._id.toString() !== vehicleId.toString()) {
          if (existingVehicle.userId.toString() === userId.toString()) {
            throw new AppError('You already have an active vehicle registered with this registration number.', 409);
          } else {
            throw new AppError('A vehicle with this registration number is already registered in the system.', 409);
          }
        }
        payload.registrationNumber = normalizedReg;
      }
    }

    // 4. Registration Year
    if (updateData.registrationYear !== undefined) {
      payload.registrationYear = Number(updateData.registrationYear);
    }

    // 5. Fuel Type & Transmission
    if (updateData.fuelType !== undefined) payload.fuelType = updateData.fuelType;
    if (updateData.transmission !== undefined) payload.transmission = updateData.transmission || null;

    // 6. Color, VIN, Odometer
    if (updateData.color !== undefined) payload.color = updateData.color.trim();
    if (updateData.vinNumber !== undefined) {
      payload.vinNumber = updateData.vinNumber ? updateData.vinNumber.trim().toUpperCase() : null;
    }
    if (updateData.odometerReading !== undefined) {
      payload.odometerReading = Number(updateData.odometerReading);
    }

    const updatedVehicle = await vehicleRepository.updateById(vehicleId, payload);
    return this.formatVehicleResponse(updatedVehicle);
  }

  /**
   * Safely deactivate (soft-delete) a vehicle
   * If the vehicle was the default, automatically promotes another active vehicle if one exists
   * @param {string} userId
   * @param {string} vehicleId
   * @returns {Promise<{ message: string }>}
   */
  async deactivateVehicle(userId, vehicleId) {
    this.assertValidObjectId(vehicleId);

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found.', 404);
    }

    // Strict ownership verification
    if (vehicle.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to delete this vehicle.', 403);
    }

    if (vehicle.status === VEHICLE_STATUS.INACTIVE) {
      throw new AppError('Vehicle is already inactive.', 400);
    }

    const wasDefault = vehicle.isDefault;

    // Soft delete vehicle
    await vehicleRepository.deactivateById(vehicleId);

    // If default vehicle was deactivated, promote another active vehicle to default if available
    if (wasDefault) {
      const fallbackVehicle = await vehicleRepository.findFirstActiveByUserId(userId);
      if (fallbackVehicle) {
        await vehicleRepository.setDefaultVehicle(fallbackVehicle._id, userId);
      }
    }

    return { message: 'Vehicle deleted successfully.' };
  }

  /**
   * Set a vehicle as the user's default vehicle
   * Automatically removes default flag from user's other vehicles
   * @param {string} userId
   * @param {string} vehicleId
   * @returns {Promise<object>}
   */
  async setDefaultVehicle(userId, vehicleId) {
    this.assertValidObjectId(vehicleId);

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new AppError('Vehicle not found.', 404);
    }

    // Strict ownership verification
    if (vehicle.userId.toString() !== userId.toString()) {
      throw new AppError('Forbidden. You do not have permission to modify this vehicle.', 403);
    }

    // Inactive vehicle check
    if (vehicle.status === VEHICLE_STATUS.INACTIVE) {
      throw new AppError('Cannot set an inactive vehicle as default.', 400);
    }

    if (vehicle.isDefault) {
      return this.formatVehicleResponse(vehicle);
    }

    const updatedVehicle = await vehicleRepository.setDefaultVehicle(vehicleId, userId);
    return this.formatVehicleResponse(updatedVehicle);
  }
}

module.exports = {
  VehicleService,
  AppError,
  vehicleService: new VehicleService(),
};
