const Vehicle = require('./vehicle.model');
const { VEHICLE_STATUS } = require('./vehicle.constants');

/**
 * Vehicle Repository
 *
 * Encapsulates all direct database queries for the Vehicle collection.
 * Contains zero HTTP or business logic.
 */
class VehicleRepository {
  /**
   * Create a new vehicle document
   * @param {object} vehicleData
   * @returns {Promise<import('./vehicle.model')>}
   */
  async create(vehicleData) {
    return Vehicle.create(vehicleData);
  }

  /**
   * Find vehicle by its MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./vehicle.model')|null>}
   */
  async findById(id) {
    return Vehicle.findById(id).exec();
  }

  /**
   * Find vehicle by _id and userId (Ownership-scoped query)
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./vehicle.model')|null>}
   */
  async findByIdAndUserId(id, userId) {
    return Vehicle.findOne({ _id: id, userId }).exec();
  }

  /**
   * Find all vehicles belonging to a user
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {object} options
   * @param {string} [options.status] - Optional status filter, defaults to ACTIVE
   * @returns {Promise<Array<import('./vehicle.model')>>}
   */
  async findByUserId(userId, { status = VEHICLE_STATUS.ACTIVE } = {}) {
    const query = { userId };
    if (status) {
      query.status = status;
    }
    return Vehicle.find(query).sort({ isDefault: -1, createdAt: -1 }).exec();
  }

  /**
   * Find a vehicle by registration number (case-insensitive lookup)
   * @param {string} registrationNumber
   * @param {object} options
   * @param {string} [options.status]
   * @returns {Promise<import('./vehicle.model')|null>}
   */
  async findByRegistrationNumber(registrationNumber, { status } = {}) {
    const query = { registrationNumber: registrationNumber.toUpperCase().trim() };
    if (status) {
      query.status = status;
    }
    return Vehicle.findOne(query).exec();
  }

  /**
   * Count active vehicles for a specific user
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<number>}
   */
  async countActiveByUserId(userId) {
    return Vehicle.countDocuments({ userId, status: VEHICLE_STATUS.ACTIVE }).exec();
  }

  /**
   * Update vehicle by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./vehicle.model')|null>}
   */
  async updateById(id, updateData) {
    return Vehicle.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Deactivate vehicle by _id (Soft delete and unsets default flag)
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./vehicle.model')|null>}
   */
  async deactivateById(id) {
    return Vehicle.findByIdAndUpdate(
      id,
      {
        $set: {
          status: VEHICLE_STATUS.INACTIVE,
          isDefault: false,
        },
      },
      { new: true }
    ).exec();
  }

  /**
   * Clear isDefault flag on all vehicles belonging to a user
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('mongodb').UpdateResult>}
   */
  async clearDefaultVehicles(userId) {
    return Vehicle.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } }).exec();
  }

  /**
   * Atomically designate a vehicle as default for a user
   * Clears existing default flag on all user's vehicles and flags the target vehicle
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./vehicle.model')|null>}
   */
  async setDefaultVehicle(id, userId) {
    await this.clearDefaultVehicles(userId);
    return Vehicle.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isDefault: true } },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Find first active vehicle for a user (useful for fallback default selection)
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./vehicle.model')|null>}
   */
  async findFirstActiveByUserId(userId) {
    return Vehicle.findOne({ userId, status: VEHICLE_STATUS.ACTIVE }).sort({ createdAt: 1 }).exec();
  }
}

module.exports = new VehicleRepository();
