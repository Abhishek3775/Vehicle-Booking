const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const mechanicRepository = require('./mechanic.repository');
const Auth = require('../auth/auth.model');
const User = require('../user/user.model');
const Service = require('../service/service.model');
const {
  AVAILABILITY_STATUS,
  WORK_STATUS,
  VERIFICATION_STATUS,
  PAGINATION_LIMITS,
} = require('./mechanic.constants');
const { ROLES, ACCOUNT_STATUS } = require('../auth/auth.constants');

/**
 * Mechanic Service Layer
 *
 * Implements business logic for managing mechanic profiles:
 * - Admin creation and verification of mechanic profiles for registered MECHANIC users
 * - Human-readable unique mechanic code generation with collision resilience
 * - Self-profile retrieval and updates with strict authorization guards
 * - Safe availability, work-status, and location updates
 * - Dispatch eligibility lookups and geographic proximity filtering
 * - Role-based response data sanitization (Customer vs Mechanic vs Admin)
 */
class MechanicService {
  /**
   * Format Mechanic Mongoose document into standardized API response structure
   * @param {import('./mechanic.model')} mechanic
   * @param {object} [options]
   * @param {boolean} [options.isCustomer=false]
   * @returns {object}
   */
  formatMechanicResponse(mechanic, { isCustomer = false } = {}) {
    const base = {
      id: mechanic._id ? mechanic._id.toString() : mechanic.id,
      mechanicCode: mechanic.mechanicCode,
      displayName: mechanic.displayName,
      profileImage: mechanic.profileImage || null,
      experienceYears: mechanic.experienceYears || 0,
      specialization: mechanic.specialization,
      skills: mechanic.skills || [],
      supportedVehicleTypes: mechanic.supportedVehicleTypes || [],
      ratingSummary: mechanic.ratingSummary || { averageRating: 0, totalRatings: 0 },
      availabilityStatus: mechanic.availabilityStatus,
    };

    if (isCustomer) {
      return base;
    }

    return {
      ...base,
      userId: mechanic.userId ? (mechanic.userId._id ? mechanic.userId._id.toString() : mechanic.userId.toString()) : null,
      phone: mechanic.phone || '',
      supportedServiceIds: (mechanic.supportedServiceIds || []).map((s) => {
        if (s && typeof s === 'object' && s._id) {
          return {
            id: s._id.toString(),
            name: s.name,
            category: s.category,
            basePrice: s.basePrice,
            estimatedDuration: s.estimatedDuration,
          };
        }
        return s ? s.toString() : s;
      }),
      workStatus: mechanic.workStatus,
      verificationStatus: mechanic.verificationStatus,
      currentLocation: mechanic.currentLocation || { latitude: null, longitude: null, updatedAt: null },
      serviceRadius: mechanic.serviceRadius,
      completedJobs: mechanic.completedJobs || 0,
      cancelledJobs: mechanic.cancelledJobs || 0,
      notes: mechanic.notes || '',
      createdAt: mechanic.createdAt,
      updatedAt: mechanic.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId format
   * @param {string} id
   * @param {string} [entityName='mechanic']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'mechanic') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Calculate great-circle distance between two coordinate pairs using Haversine formula (in km)
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number}
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
        lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
      return Infinity;
    }
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Generate a unique human-readable mechanic code
   * Example: MECH-20260926-0042
   * @returns {Promise<string>}
   */
  async generateMechanicCode() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const code = `MECH-${dateStr}-${randomSuffix}`;
      
      // If database is connected, check for collisions
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const existing = await mechanicRepository.findByCode(code);
        if (!existing) {
          return code;
        }
      } else {
        return code;
      }
    }

    // Fallback using timestamp
    return `MECH-${dateStr}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Create a new mechanic profile (Admin only)
   * @param {object} payload
   * @param {object} authUser
   * @returns {Promise<object>}
   */
  async createMechanicProfile(payload, authUser) {
    if (authUser.role !== ROLES.ADMIN) {
      throw new AppError('Access denied: Only administrators can create mechanic profiles.', 403);
    }

    const { userId } = payload;
    this.assertValidObjectId(userId, 'user');

    // 1. Verify target user exists and has MECHANIC role in Auth
    const targetAuth = await Auth.findOne({ userId }).exec();
    if (!targetAuth) {
      throw new AppError('Target user account not found in authentication system.', 404);
    }

    if (targetAuth.role !== ROLES.MECHANIC) {
      throw new AppError(`Cannot create mechanic profile: User has role '${targetAuth.role}', but must have '${ROLES.MECHANIC}' role.`, 400);
    }

    // 2. Check if a mechanic profile already exists for this user
    const existingProfile = await mechanicRepository.findByUserId(userId);
    if (existingProfile) {
      throw new AppError('A mechanic profile already exists for this user.', 409);
    }

    // 3. Verify supportedServiceIds if provided
    if (payload.supportedServiceIds && payload.supportedServiceIds.length > 0) {
      const validServicesCount = await Service.countDocuments({
        _id: { $in: payload.supportedServiceIds },
      }).exec();

      if (validServicesCount !== payload.supportedServiceIds.length) {
        throw new AppError('One or more supported service IDs do not exist in the catalogue.', 400);
      }
    }

    // 4. Generate unique mechanic code
    const mechanicCode = await this.generateMechanicCode();

    // 5. Build mechanic data
    const mechanicData = {
      userId: new mongoose.Types.ObjectId(userId),
      mechanicCode,
      displayName: payload.displayName.trim(),
      profileImage: payload.profileImage || null,
      phone: payload.phone ? payload.phone.trim() : targetAuth.phone || '',
      experienceYears: payload.experienceYears || 0,
      specialization: payload.specialization || undefined,
      skills: payload.skills || [],
      supportedVehicleTypes: payload.supportedVehicleTypes || undefined,
      supportedServiceIds: (payload.supportedServiceIds || []).map((id) => new mongoose.Types.ObjectId(id)),
      serviceRadius: payload.serviceRadius || undefined,
      availabilityStatus: payload.availabilityStatus || AVAILABILITY_STATUS.OFFLINE,
      workStatus: payload.workStatus || WORK_STATUS.IDLE,
      verificationStatus: payload.verificationStatus || VERIFICATION_STATUS.PENDING,
      notes: payload.notes || '',
    };

    const newMechanic = await mechanicRepository.create(mechanicData);
    const populated = await mechanicRepository.findById(newMechanic._id);
    return this.formatMechanicResponse(populated);
  }

  /**
   * Get mechanic profile by ID
   * @param {string} mechanicId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getMechanicById(mechanicId, requestingUser) {
    this.assertValidObjectId(mechanicId, 'mechanic');

    const mechanic = await mechanicRepository.findById(mechanicId);
    if (!mechanic) {
      throw new AppError('Mechanic profile not found.', 404);
    }

    const requestingUserId = typeof requestingUser === 'object' ? (requestingUser.userId || requestingUser._id || requestingUser.id) : null;
    const isSelf = mechanic.userId && requestingUserId && mechanic.userId.toString() === requestingUserId.toString();
    const isAdmin = requestingUser === ROLES.ADMIN || requestingUser?.role === ROLES.ADMIN;
    const isCustomer = !isAdmin && !isSelf;

    return this.formatMechanicResponse(mechanic, { isCustomer });
  }

  /**
   * Get authenticated mechanic's own profile
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getMyProfile(requestingUser) {
    if (requestingUser.role !== ROLES.MECHANIC) {
      throw new AppError('Access denied: User is not registered with a mechanic role.', 403);
    }

    const userId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const mechanic = await mechanicRepository.findByUserId(userId);

    if (!mechanic) {
      throw new AppError('Mechanic profile not found for this user account. Contact administrator.', 404);
    }

    return this.formatMechanicResponse(mechanic);
  }

  /**
   * List and search mechanics with filtering and pagination (Admin only)
   * @param {object} queryParams
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getMechanicsList(queryParams = {}, requestingUser = {}) {
    const role =
      requestingUser?.role ||
      (typeof requestingUser === 'string' ? requestingUser : null) ||
      queryParams?.userRole ||
      queryParams?.role;

    if (role !== ROLES.ADMIN) {
      throw new AppError('Access denied: Only administrators can list mechanics.', 403);
    }

    const actualParams = queryParams?.query || queryParams;

    const page = Math.max(1, parseInt(actualParams.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION_LIMITS.MAX_LIMIT,
      Math.max(1, parseInt(actualParams.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT)
    );
    const skip = (page - 1) * limit;

    const filter = {};

    if (queryParams.availabilityStatus) {
      filter.availabilityStatus = queryParams.availabilityStatus.toUpperCase().trim();
    }

    if (queryParams.workStatus) {
      filter.workStatus = queryParams.workStatus.toUpperCase().trim();
    }

    if (queryParams.verificationStatus) {
      filter.verificationStatus = queryParams.verificationStatus.toUpperCase().trim();
    }

    if (queryParams.vehicleType) {
      filter.supportedVehicleTypes = queryParams.vehicleType.toUpperCase().trim();
    }

    if (queryParams.serviceId && mongoose.Types.ObjectId.isValid(queryParams.serviceId)) {
      filter.supportedServiceIds = new mongoose.Types.ObjectId(queryParams.serviceId);
    }

    if (queryParams.search && typeof queryParams.search === 'string' && queryParams.search.trim()) {
      const searchRegex = new RegExp(queryParams.search.trim(), 'i');
      filter.$or = [
        { displayName: searchRegex },
        { mechanicCode: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [mechanics, total] = await Promise.all([
      mechanicRepository.findMany({ filter, skip, limit, sort: { createdAt: -1 } }),
      mechanicRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      mechanics: mechanics.map((m) => this.formatMechanicResponse(m)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Update mechanic profile
   * @param {string} mechanicId
   * @param {object} updateData
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async updateMechanicProfile(mechanicId, updateData, requestingUser) {
    this.assertValidObjectId(mechanicId, 'mechanic');

    const mechanic = await mechanicRepository.findById(mechanicId, { populateServices: false });
    if (!mechanic) {
      throw new AppError('Mechanic profile not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isSelf = mechanic.userId && mechanic.userId.toString() === requestingUserId?.toString();
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    if (!isAdmin && !isSelf) {
      throw new AppError('Access denied: You can only update your own mechanic profile.', 403);
    }

    // Verify supportedServiceIds if provided
    if (updateData.supportedServiceIds && updateData.supportedServiceIds.length > 0) {
      const validServicesCount = await Service.countDocuments({
        _id: { $in: updateData.supportedServiceIds },
      }).exec();

      if (validServicesCount !== updateData.supportedServiceIds.length) {
        throw new AppError('One or more supported service IDs do not exist in the catalogue.', 400);
      }
      updateData.supportedServiceIds = updateData.supportedServiceIds.map((id) => new mongoose.Types.ObjectId(id));
    }

    const updatedMechanic = await mechanicRepository.updateById(mechanicId, updateData);
    return this.formatMechanicResponse(updatedMechanic);
  }

  /**
   * Update mechanic availability status
   * @param {string} mechanicId
   * @param {string} availabilityStatus
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async updateAvailability(mechanicId, availabilityStatus, requestingUser) {
    this.assertValidObjectId(mechanicId, 'mechanic');

    const mechanic = await mechanicRepository.findById(mechanicId, { populateServices: false });
    if (!mechanic) {
      throw new AppError('Mechanic profile not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isSelf = mechanic.userId && mechanic.userId.toString() === requestingUserId?.toString();
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    if (!isAdmin && !isSelf) {
      throw new AppError('Access denied: You can only update your own availability.', 403);
    }

    await mechanicRepository.updateAvailability(mechanicId, availabilityStatus);
    const updated = await mechanicRepository.findById(mechanicId);
    return this.formatMechanicResponse(updated);
  }

  /**
   * Update mechanic work status
   * @param {string} mechanicId
   * @param {string} workStatus
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async updateWorkStatus(mechanicId, workStatus, requestingUser) {
    this.assertValidObjectId(mechanicId, 'mechanic');

    const mechanic = await mechanicRepository.findById(mechanicId, { populateServices: false });
    if (!mechanic) {
      throw new AppError('Mechanic profile not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isSelf = mechanic.userId && mechanic.userId.toString() === requestingUserId?.toString();
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    if (!isAdmin && !isSelf) {
      throw new AppError('Access denied: You can only update your own work status.', 403);
    }

    // Business validation: cannot transition to ON_JOB if account availability is OFFLINE
    if (workStatus === WORK_STATUS.ON_JOB && mechanic.availabilityStatus === AVAILABILITY_STATUS.OFFLINE) {
      throw new AppError('Cannot set work status to ON_JOB while availability is OFFLINE. Set availability to AVAILABLE first.', 400);
    }

    await mechanicRepository.updateWorkStatus(mechanicId, workStatus);
    const updated = await mechanicRepository.findById(mechanicId);
    return this.formatMechanicResponse(updated);
  }

  /**
   * Update mechanic geographic location
   * @param {string} mechanicId
   * @param {object} coordinates
   * @param {number} coordinates.latitude
   * @param {number} coordinates.longitude
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async updateLocation(mechanicId, { latitude, longitude }, requestingUser) {
    this.assertValidObjectId(mechanicId, 'mechanic');

    const mechanic = await mechanicRepository.findById(mechanicId, { populateServices: false });
    if (!mechanic) {
      throw new AppError('Mechanic profile not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isSelf = mechanic.userId && mechanic.userId.toString() === requestingUserId?.toString();
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    if (!isAdmin && !isSelf) {
      throw new AppError('Access denied: You can only update your own location.', 403);
    }

    await mechanicRepository.updateLocation(mechanicId, latitude, longitude);
    const updated = await mechanicRepository.findById(mechanicId);
    return this.formatMechanicResponse(updated);
  }

  /**
   * Update mechanic verification status (Admin only)
   * @param {string} mechanicId
   * @param {object} payload
   * @param {string} payload.verificationStatus
   * @param {string} [payload.notes]
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async updateVerificationStatus(mechanicId, { verificationStatus, notes }, requestingUser) {
    if (requestingUser.role !== ROLES.ADMIN) {
      throw new AppError('Access denied: Only administrators can update verification status.', 403);
    }

    this.assertValidObjectId(mechanicId, 'mechanic');

    const mechanic = await mechanicRepository.findById(mechanicId, { populateServices: false });
    if (!mechanic) {
      throw new AppError('Mechanic profile not found.', 404);
    }

    await mechanicRepository.updateVerification(mechanicId, verificationStatus, notes);
    const updated = await mechanicRepository.findById(mechanicId);
    return this.formatMechanicResponse(updated);
  }

  /**
   * Find eligible mechanics ready for dispatch
   * @param {object} criteria
   * @param {string} [criteria.vehicleType]
   * @param {string} [criteria.serviceId]
   * @param {number} [criteria.latitude]
   * @param {number} [criteria.longitude]
   * @param {number} [criteria.maxDistanceKm]
   * @returns {Promise<Array<object>>}
   */
  async findEligibleMechanics({ vehicleType, serviceId, latitude, longitude, maxDistanceKm } = {}) {
    const mechanics = await mechanicRepository.findEligibleMechanics({
      vehicleType,
      serviceId,
    });

    // If coordinates are provided, compute distance and apply radius filter
    if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
      const candidates = [];

      for (const mech of mechanics) {
        if (!mech.currentLocation || mech.currentLocation.latitude === null || mech.currentLocation.longitude === null) {
          continue;
        }

        const distance = this.calculateDistance(
          latitude,
          longitude,
          mech.currentLocation.latitude,
          mech.currentLocation.longitude
        );

        const allowedRadius = maxDistanceKm !== undefined ? maxDistanceKm : (mech.serviceRadius || 15);

        if (distance <= allowedRadius) {
          candidates.push({
            mechanic: this.formatMechanicResponse(mech),
            distanceKm: Math.round(distance * 100) / 100,
          });
        }
      }

      candidates.sort((a, b) => a.distanceKm - b.distanceKm);
      return candidates;
    }

    return mechanics.map((m) => ({
      mechanic: this.formatMechanicResponse(m),
      distanceKm: null,
    }));
  }
}

module.exports = new MechanicService();
