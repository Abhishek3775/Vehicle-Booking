const Mechanic = require('./mechanic.model');
const {
  AVAILABILITY_STATUS,
  WORK_STATUS,
  VERIFICATION_STATUS,
} = require('./mechanic.constants');

/**
 * Mechanic Repository Layer
 *
 * Encapsulates all direct database queries and atomic updates for the Mechanic collection.
 * Pure database layer containing zero HTTP or business logic.
 */
class MechanicRepository {
  /**
   * Create a new mechanic profile
   * @param {object} mechanicData
   * @returns {Promise<import('./mechanic.model')>}
   */
  async create(mechanicData) {
    return Mechanic.create(mechanicData);
  }

  /**
   * Find mechanic profile by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} [options]
   * @param {boolean} [options.populateServices=true]
   * @param {boolean} [options.populateUser=true]
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async findById(id, { populateServices = true, populateUser = false } = {}) {
    let query = Mechanic.findById(id);

    if (populateServices) {
      query = query.populate('supportedServiceIds', 'name category basePrice estimatedDuration');
    }

    if (populateUser) {
      query = query.populate('userId', 'firstName lastName email profileImage');
    }

    return query.exec();
  }

  /**
   * Find mechanic profile by userId (Auth/User reference)
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {object} [options]
   * @param {boolean} [options.populateServices=true]
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async findByUserId(userId, { populateServices = true } = {}) {
    let query = Mechanic.findOne({ userId });

    if (populateServices) {
      query = query.populate('supportedServiceIds', 'name category basePrice estimatedDuration');
    }

    return query.exec();
  }

  /**
   * Find mechanic profile by unique mechanicCode
   * @param {string} mechanicCode
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async findByCode(mechanicCode) {
    return Mechanic.findOne({ mechanicCode: mechanicCode.toUpperCase().trim() }).exec();
  }

  /**
   * Update mechanic profile by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async updateById(id, updateData) {
    return Mechanic.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('supportedServiceIds', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Update mechanic profile by userId
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {object} updateData
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async updateByUserId(userId, updateData) {
    return Mechanic.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('supportedServiceIds', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Update mechanic availability status
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string} availabilityStatus
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async updateAvailability(id, availabilityStatus) {
    return Mechanic.findByIdAndUpdate(
      id,
      { $set: { availabilityStatus } },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Update mechanic work status
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string} workStatus
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async updateWorkStatus(id, workStatus) {
    return Mechanic.findByIdAndUpdate(
      id,
      { $set: { workStatus } },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Update mechanic verification status
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string} verificationStatus
   * @param {string} [notes]
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async updateVerification(id, verificationStatus, notes) {
    const update = { verificationStatus };
    if (notes !== undefined) {
      update.notes = notes;
    }
    return Mechanic.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Update mechanic current location
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async updateLocation(id, latitude, longitude) {
    return Mechanic.findByIdAndUpdate(
      id,
      {
        $set: {
          currentLocation: {
            latitude,
            longitude,
            updatedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Query mechanics with filtering, sorting, and pagination
   * @param {object} params
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=20]
   * @param {boolean} [params.populateServices=true]
   * @returns {Promise<Array<import('./mechanic.model')>>}
   */
  async findMany({
    filter = {},
    sort = { createdAt: -1 },
    skip = 0,
    limit = 20,
    populateServices = true,
  } = {}) {
    let query = Mechanic.find(filter).sort(sort).skip(skip).limit(limit);

    if (populateServices) {
      query = query.populate('supportedServiceIds', 'name category basePrice estimatedDuration');
    }

    return query.exec();
  }

  /**
   * Count mechanics matching a query filter
   * @param {object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return Mechanic.countDocuments(filter).exec();
  }

  /**
   * Find eligible mechanics ready for dispatch matching vehicle, service, and status criteria
   * @param {object} criteria
   * @param {string} [criteria.vehicleType]
   * @param {string|import('mongoose').Types.ObjectId} [criteria.serviceId]
   * @returns {Promise<Array<import('./mechanic.model')>>}
   */
  async findEligibleMechanics({ vehicleType, serviceId } = {}) {
    const filter = {
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
      workStatus: WORK_STATUS.IDLE,
    };

    if (vehicleType) {
      filter.supportedVehicleTypes = vehicleType;
    }

    if (serviceId) {
      filter.supportedServiceIds = serviceId;
    }

    return Mechanic.find(filter)
      .populate('supportedServiceIds', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Atomically increment job counters
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} counters
   * @param {number} [counters.completed=0]
   * @param {number} [counters.cancelled=0]
   * @returns {Promise<import('./mechanic.model')|null>}
   */
  async incrementJobCounters(id, { completed = 0, cancelled = 0 } = {}) {
    const inc = {};
    if (completed) inc.completedJobs = completed;
    if (cancelled) inc.cancelledJobs = cancelled;

    if (Object.keys(inc).length === 0) return this.findById(id);

    return Mechanic.findByIdAndUpdate(id, { $inc: inc }, { new: true }).exec();
  }
}

module.exports = new MechanicRepository();
