const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const locationRepository = require('./location.repository');
const Location = require('./location.model');
const Mechanic = require('../mechanic/mechanic.model');
const {
  AVAILABILITY_STATUS,
  WORK_STATUS,
  VERIFICATION_STATUS,
} = require('../mechanic/mechanic.constants');
const { ROLES } = require('../auth/auth.constants');
const { LOCATION_LIMITS } = require('./location.constants');

/**
 * Location Service Layer
 *
 * Implements business logic for geospatial operations:
 * - Customer & Mechanic current GPS location updates with historical sampling
 * - Proximity and nearby eligible mechanic discovery via MongoDB 2dsphere indexing
 * - Great-circle distance calculations using the Haversine formula
 * - Location history pagination and user data clearing
 * - Strict role-based location privacy and security guards
 */
class LocationService {
  /**
   * Format Location Mongoose document into standardized API response
   * @param {import('./location.model')} locationDoc
   * @returns {object}
   */
  formatLocationResponse(locationDoc) {
    if (!locationDoc) return null;

    return {
      id: locationDoc._id ? locationDoc._id.toString() : locationDoc.id,
      userId: locationDoc.userId ? (locationDoc.userId._id ? locationDoc.userId._id.toString() : locationDoc.userId.toString()) : null,
      mechanicId: locationDoc.mechanicId ? (locationDoc.mechanicId._id ? locationDoc.mechanicId._id.toString() : locationDoc.mechanicId.toString()) : null,
      latitude: locationDoc.latitude,
      longitude: locationDoc.longitude,
      accuracy: locationDoc.accuracy ?? null,
      altitude: locationDoc.altitude ?? null,
      heading: locationDoc.heading ?? null,
      speed: locationDoc.speed ?? null,
      address: locationDoc.address ?? null,
      city: locationDoc.city ?? null,
      state: locationDoc.state ?? null,
      country: locationDoc.country ?? null,
      postalCode: locationDoc.postalCode ?? null,
      source: locationDoc.source,
      locationType: locationDoc.locationType,
      isCurrent: locationDoc.isCurrent,
      createdAt: locationDoc.createdAt,
      updatedAt: locationDoc.updatedAt,
    };
  }

  /**
   * Calculate great-circle distance between two points using Haversine formula
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {{ distanceMeters: number, distanceKilometers: number }}
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (
      lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
      lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined
    ) {
      return { distanceMeters: 0, distanceKilometers: 0 };
    }

    const R = 6371000; // Earth's mean radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceMeters = Math.round(R * c);
    const distanceKilometers = Math.round((distanceMeters / 1000) * 100) / 100;

    return { distanceMeters, distanceKilometers };
  }

  /**
   * Update or initialize customer current location
   * Preserves controlled location history if displacement/time thresholds are met.
   * @param {string} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async updateCustomerCurrentLocation(userId, payload) {
    const existing = await locationRepository.findCurrentLocationByUser(userId);

    if (existing) {
      const timeDeltaMs = Date.now() - new Date(existing.updatedAt).getTime();
      const { distanceMeters } = this.calculateHaversineDistance(
        existing.latitude,
        existing.longitude,
        payload.latitude,
        payload.longitude
      );

      // Create history snapshot only if significant movement occurred and interval elapsed
      if (
        timeDeltaMs >= LOCATION_LIMITS.MIN_UPDATE_INTERVAL_MS &&
        distanceMeters >= LOCATION_LIMITS.MIN_DISTANCE_THRESHOLD_METERS
      ) {
        await locationRepository.createHistoryRecord({
          userId,
          latitude: existing.latitude,
          longitude: existing.longitude,
          accuracy: existing.accuracy,
          altitude: existing.altitude,
          heading: existing.heading,
          speed: existing.speed,
          address: existing.address,
          city: existing.city,
          state: existing.state,
          country: existing.country,
          postalCode: existing.postalCode,
          source: existing.source,
        });
      }
    }

    const updated = await locationRepository.upsertCurrentLocation({
      userId,
      ...payload,
    });

    return this.formatLocationResponse(updated);
  }

  /**
   * Get authenticated customer's current location
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getCustomerCurrentLocation(userId) {
    const location = await locationRepository.findCurrentLocationByUser(userId);
    if (!location) {
      throw new AppError('Current location not found for this user.', 404);
    }
    return this.formatLocationResponse(location);
  }

  /**
   * Get authenticated customer's location history with pagination and date filter
   * @param {string} userId
   * @param {object} options
   * @returns {Promise<{ items: Array<object>, pagination: object }>}
   */
  async getCustomerLocationHistory(userId, { page = 1, limit = 20, startDate, endDate } = {}) {
    const [records, total] = await Promise.all([
      locationRepository.findLocationHistoryByUser(userId, { page, limit, startDate, endDate }),
      locationRepository.countLocationHistoryByUser(userId, { startDate, endDate }),
    ]);

    return {
      items: records.map((r) => this.formatLocationResponse(r)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Clear authenticated customer's location history
   * @param {string} userId
   * @returns {Promise<{ message: string, deletedCount: number }>}
   */
  async clearCustomerLocationHistory(userId) {
    const result = await locationRepository.clearLocationHistoryByUser(userId);
    return {
      message: 'Location history cleared successfully',
      deletedCount: result.deletedCount || 0,
    };
  }

  /**
   * Update mechanic's current location
   * Syncs with Mechanic model and records sampled history.
   * @param {string} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async updateMechanicCurrentLocation(userId, payload) {
    const mechanic = await Mechanic.findOne({ userId });
    if (!mechanic) {
      throw new AppError('Mechanic profile not found. Only registered mechanics can update mechanic location.', 404);
    }

    const existing = await locationRepository.findCurrentLocationByMechanic(mechanic._id);

    if (existing) {
      const timeDeltaMs = Date.now() - new Date(existing.updatedAt).getTime();
      const { distanceMeters } = this.calculateHaversineDistance(
        existing.latitude,
        existing.longitude,
        payload.latitude,
        payload.longitude
      );

      if (
        timeDeltaMs >= LOCATION_LIMITS.MIN_UPDATE_INTERVAL_MS &&
        distanceMeters >= LOCATION_LIMITS.MIN_DISTANCE_THRESHOLD_METERS
      ) {
        await locationRepository.createHistoryRecord({
          userId,
          mechanicId: mechanic._id,
          latitude: existing.latitude,
          longitude: existing.longitude,
          accuracy: existing.accuracy,
          altitude: existing.altitude,
          heading: existing.heading,
          speed: existing.speed,
          source: existing.source,
        });
      }
    }

    const updated = await locationRepository.upsertCurrentLocation({
      userId,
      mechanicId: mechanic._id,
      ...payload,
    });

    // Synchronize current location with Mechanic document
    await Mechanic.updateOne(
      { _id: mechanic._id },
      {
        $set: {
          currentLocation: {
            latitude: payload.latitude,
            longitude: payload.longitude,
            updatedAt: new Date(),
          },
        },
      }
    );

    return this.formatLocationResponse(updated);
  }

  /**
   * Get authenticated mechanic's own current location
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getMechanicCurrentLocationSelf(userId) {
    const mechanic = await Mechanic.findOne({ userId });
    if (!mechanic) {
      throw new AppError('Mechanic profile not found.', 404);
    }

    const location = await locationRepository.findCurrentLocationByMechanic(mechanic._id);
    if (!location) {
      throw new AppError('Current mechanic location not found.', 404);
    }

    return this.formatLocationResponse(location);
  }

  /**
   * Get current location of a specific mechanic by ID
   * Authorized for ADMIN or the mechanic themselves; forbidden for customers.
   * @param {string} mechanicId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getMechanicCurrentLocationById(mechanicId, requestingUser) {
    if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
      throw new AppError('Invalid mechanic ID format.', 400);
    }

    if (requestingUser.role === ROLES.CUSTOMER) {
      throw new AppError('Access denied: Customers cannot access arbitrary mechanic locations.', 403);
    }

    if (requestingUser.role === ROLES.MECHANIC) {
      const requestingUserId = requestingUser.userId || requestingUser.id || requestingUser._id;
      const mechanic = await Mechanic.findOne({ userId: requestingUserId });
      if (!mechanic || mechanic._id.toString() !== mechanicId.toString()) {
        throw new AppError('Access denied: You can only view your own mechanic location.', 403);
      }
    }

    const location = await locationRepository.findCurrentLocationByMechanic(mechanicId);
    if (!location) {
      throw new AppError('Location not found for the specified mechanic.', 404);
    }

    return this.formatLocationResponse(location);
  }

  /**
   * Find nearby eligible mechanics using MongoDB 2dsphere index and filter by status
   * @param {object} query
   * @param {number} query.latitude
   * @param {number} query.longitude
   * @param {number} query.radiusKm
   * @returns {Promise<Array<object>>}
   */
  async getNearbyMechanics({ latitude, longitude, radiusKm }) {
    const maxDistanceMeters = Math.round(radiusKm * 1000);

    const nearbyLocations = await locationRepository.findNearbyMechanicLocations({
      latitude,
      longitude,
      maxDistanceMeters,
    });

    const results = [];

    for (const loc of nearbyLocations) {
      const mech = loc.mechanicId;
      if (!mech) continue;

      // Check operational dispatch eligibility
      const isEligible =
        mech.availabilityStatus === AVAILABILITY_STATUS.AVAILABLE &&
        mech.workStatus === WORK_STATUS.IDLE &&
        mech.verificationStatus === VERIFICATION_STATUS.VERIFIED;

      if (!isEligible) continue;

      const dist = this.calculateHaversineDistance(
        latitude,
        longitude,
        loc.latitude,
        loc.longitude
      );

      // Check if distance is within the mechanic's own service radius
      const allowedRadiusKm = mech.serviceRadius || radiusKm;
      if (dist.distanceKilometers <= radiusKm && dist.distanceKilometers <= allowedRadiusKm) {
        results.push({
          mechanic: {
            id: mech._id.toString(),
            mechanicCode: mech.mechanicCode,
            displayName: mech.displayName,
            profileImage: mech.profileImage || null,
            experienceYears: mech.experienceYears || 0,
            specialization: mech.specialization,
            ratingSummary: mech.ratingSummary || { averageRating: 0, totalRatings: 0 },
            availabilityStatus: mech.availabilityStatus,
            serviceRadius: mech.serviceRadius,
          },
          distanceKilometers: dist.distanceKilometers,
          distanceMeters: dist.distanceMeters,
          location: {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            updatedAt: loc.updatedAt,
          },
        });
      }
    }

    // Sort by ascending distance
    results.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return results;
  }

  /**
   * Calculate straight-line distance between origin and destination coordinates
   * @param {object} origin
   * @param {object} destination
   * @returns {{ distanceMeters: number, distanceKilometers: number }}
   */
  calculateDistanceBetweenPoints(origin, destination) {
    return this.calculateHaversineDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );
  }
}

const locationService = new LocationService();

module.exports = {
  LocationService,
  locationService,
  AppError,
};
