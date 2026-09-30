const Location = require('./location.model');
const { LOCATION_TYPES, LOCATION_LIMITS } = require('./location.constants');

/**
 * Location Repository Layer
 *
 * Direct database access methods for Location records.
 * Encapsulates MongoDB GeoJSON queries and transactional updates.
 */
class LocationRepository {
  /**
   * Upsert current location record for user or mechanic
   * @param {object} params
   * @returns {Promise<import('./location.model')>}
   */
  async upsertCurrentLocation({
    userId = null,
    mechanicId = null,
    latitude,
    longitude,
    accuracy = null,
    altitude = null,
    heading = null,
    speed = null,
    address = null,
    city = null,
    state = null,
    country = null,
    postalCode = null,
    source = 'GPS',
  }) {
    const filter = {
      isCurrent: true,
      ...(userId ? { userId } : { mechanicId }),
    };

    const update = {
      $set: {
        userId,
        mechanicId,
        latitude,
        longitude,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
        },
        accuracy,
        altitude,
        heading,
        speed,
        address,
        city,
        state,
        country,
        postalCode,
        source,
        locationType: LOCATION_TYPES.CURRENT,
        isCurrent: true,
        expiresAt: null,
      },
    };

    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    };

    return Location.findOneAndUpdate(filter, update, options);
  }

  /**
   * Create a historical location log record
   * @param {object} params
   * @returns {Promise<import('./location.model')>}
   */
  async createHistoryRecord({
    userId = null,
    mechanicId = null,
    latitude,
    longitude,
    accuracy = null,
    altitude = null,
    heading = null,
    speed = null,
    address = null,
    city = null,
    state = null,
    country = null,
    postalCode = null,
    source = 'GPS',
    retentionDays = LOCATION_LIMITS.HISTORY_RETENTION_DAYS,
  }) {
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    return Location.create({
      userId,
      mechanicId,
      latitude,
      longitude,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      accuracy,
      altitude,
      heading,
      speed,
      address,
      city,
      state,
      country,
      postalCode,
      source,
      locationType: LOCATION_TYPES.HISTORY,
      isCurrent: false,
      expiresAt,
    });
  }

  /**
   * Find current location by User ID
   * @param {string} userId
   * @returns {Promise<import('./location.model')|null>}
   */
  async findCurrentLocationByUser(userId) {
    return Location.findOne({ userId, isCurrent: true }).lean();
  }

  /**
   * Find current location by Mechanic ID
   * @param {string} mechanicId
   * @returns {Promise<import('./location.model')|null>}
   */
  async findCurrentLocationByMechanic(mechanicId) {
    return Location.findOne({ mechanicId, isCurrent: true }).lean();
  }

  /**
   * Find paginated location history for a user
   * @param {string} userId
   * @param {object} options
   * @returns {Promise<Array<import('./location.model')>>}
   */
  async findLocationHistoryByUser(userId, { page = 1, limit = 20, startDate, endDate } = {}) {
    const filter = {
      userId,
      isCurrent: false,
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    return Location.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /**
   * Count total history records for a user with optional date filtering
   * @param {string} userId
   * @param {object} options
   * @returns {Promise<number>}
   */
  async countLocationHistoryByUser(userId, { startDate, endDate } = {}) {
    const filter = {
      userId,
      isCurrent: false,
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    return Location.countDocuments(filter);
  }

  /**
   * Clear all historical location records for a user
   * @param {string} userId
   * @returns {Promise<{ deletedCount: number }>}
   */
  async clearLocationHistoryByUser(userId) {
    return Location.deleteMany({ userId, isCurrent: false });
  }

  /**
   * Find nearby active mechanic locations using MongoDB 2dsphere $near query
   * @param {object} params
   * @param {number} params.longitude
   * @param {number} params.latitude
   * @param {number} params.maxDistanceMeters
   * @param {number} [params.limit=50]
   * @returns {Promise<Array<import('./location.model')>>}
   */
  async findNearbyMechanicLocations({ longitude, latitude, maxDistanceMeters, limit = 50 }) {
    return Location.find({
      mechanicId: { $ne: null },
      isCurrent: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    })
      .populate('mechanicId')
      .limit(limit)
      .lean();
  }

  /**
   * Find single location record by custom query filter
   * @param {object} filter
   * @returns {Promise<import('./location.model')|null>}
   */
  async findOne(filter) {
    return Location.findOne(filter).lean();
  }
}

module.exports = new LocationRepository();
