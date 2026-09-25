const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const serviceRepository = require('./service.repository');
const {
  SERVICE_CATEGORIES,
  VEHICLE_TYPES,
  SERVICE_STATUS,
  PAGINATION_LIMITS,
} = require('./service.constants');

/**
 * Service Layer for Service Catalogue
 *
 * Implements business logic for managing platform services:
 * - Admin-controlled creation, updating, and lifecycle toggling
 * - Automatic slug generation and conflict resolution
 * - Customer catalogue discovery with public active filtering
 * - Partial search and multi-criteria category/vehicleType filtering
 * - Safe soft deletion (deactivation) preserving historical integrity
 */
class ServiceService {
  /**
   * Format Service Mongoose document into standardized API response structure
   * @param {import('./service.model')} service
   * @returns {object}
   */
  formatServiceResponse(service) {
    return {
      id: service._id.toString(),
      name: service.name,
      slug: service.slug,
      description: service.description,
      shortDescription: service.shortDescription || '',
      category: service.category,
      vehicleTypes: service.vehicleTypes || [],
      estimatedDuration: service.estimatedDuration,
      basePrice: service.basePrice,
      image: service.image || null,
      isEmergency: Boolean(service.isEmergency),
      status: service.status,
      displayOrder: service.displayOrder ?? 0,
      createdBy: service.createdBy ? service.createdBy.toString() : null,
      updatedBy: service.updatedBy ? service.updatedBy.toString() : null,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Generate URL-friendly slug from service name
   * @param {string} name
   * @returns {string}
   */
  generateSlug(name) {
    if (typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @throws {AppError}
   */
  assertValidObjectId(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid service ID format.', 400);
    }
  }

  /**
   * Create a new service catalogue entry (Admin only)
   * @param {string} adminUserId
   * @param {object} serviceData
   * @returns {Promise<object>}
   */
  async createService(adminUserId, serviceData) {
    const trimmedName = serviceData.name.trim();

    // 1. Check for duplicate exact service name
    const existingName = await serviceRepository.findByName(trimmedName);
    if (existingName) {
      throw new AppError('A service with this name already exists.', 409);
    }

    // 2. Generate and verify slug uniqueness
    const slug = serviceData.slug
      ? this.generateSlug(serviceData.slug)
      : this.generateSlug(trimmedName);

    const existingSlug = await serviceRepository.findBySlug(slug);
    if (existingSlug) {
      throw new AppError('A service with this slug already exists. Please choose a different name.', 409);
    }

    // 3. Assemble sanitized payload
    const payload = {
      name: trimmedName,
      slug,
      description: serviceData.description.trim(),
      shortDescription: serviceData.shortDescription ? serviceData.shortDescription.trim() : '',
      category: serviceData.category.toUpperCase().trim(),
      vehicleTypes: Array.isArray(serviceData.vehicleTypes) && serviceData.vehicleTypes.length > 0
        ? serviceData.vehicleTypes.map((t) => t.toUpperCase().trim())
        : [VEHICLE_TYPES.FOUR_WHEELER],
      estimatedDuration: Number(serviceData.estimatedDuration),
      basePrice: Number(serviceData.basePrice),
      image: serviceData.image ? serviceData.image.trim() : null,
      isEmergency: Boolean(serviceData.isEmergency),
      status: serviceData.status ? serviceData.status.toUpperCase().trim() : SERVICE_STATUS.ACTIVE,
      displayOrder: serviceData.displayOrder !== undefined ? Number(serviceData.displayOrder) : 0,
      createdBy: adminUserId || null,
      updatedBy: adminUserId || null,
    };

    const newService = await serviceRepository.create(payload);
    return this.formatServiceResponse(newService);
  }

  /**
   * Retrieve list of services with filtering, search, and pagination
   * Customers and public requests only receive ACTIVE services
   * @param {object} params
   * @param {object} params.query - Request query parameters
   * @param {string} [params.userRole] - Role of authenticated user (e.g. 'ADMIN')
   * @returns {Promise<{ services: Array<object>, pagination: object }>}
   */
  async getServices({ query = {}, userRole = null } = {}) {
    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    // 1. Status visibility rule:
    // Non-admins (customers & public visitors) can ONLY view ACTIVE services
    if (userRole === 'ADMIN') {
      if (query.status && Object.values(SERVICE_STATUS).includes(query.status.toUpperCase().trim())) {
        filter.status = query.status.toUpperCase().trim();
      }
    } else {
      filter.status = SERVICE_STATUS.ACTIVE;
    }

    // 2. Category filter
    if (query.category) {
      const normalizedCategory = query.category.toUpperCase().trim();
      if (Object.values(SERVICE_CATEGORIES).includes(normalizedCategory)) {
        filter.category = normalizedCategory;
      }
    }

    // 3. Vehicle type filter
    if (query.vehicleType) {
      const normalizedVehicleType = query.vehicleType.toUpperCase().trim();
      if (Object.values(VEHICLE_TYPES).includes(normalizedVehicleType)) {
        filter.vehicleTypes = normalizedVehicleType;
      }
    }

    // 4. Emergency service filter
    if (query.isEmergency !== undefined && query.isEmergency !== '') {
      filter.isEmergency = String(query.isEmergency).toLowerCase() === 'true';
    }

    // 5. Sorting convention: displayOrder ascending, then createdAt descending
    const sort = { displayOrder: 1, createdAt: -1 };

    let services = [];
    let total = 0;

    // 6. Search term execution
    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const result = await serviceRepository.search({
        searchTerm: query.search.trim(),
        filter,
        sort,
        skip,
        limit,
      });
      services = result.services;
      total = result.total;
    } else {
      [services, total] = await Promise.all([
        serviceRepository.findMany({ filter, sort, skip, limit }),
        serviceRepository.count(filter),
      ]);
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      services: services.map((s) => this.formatServiceResponse(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve single service by ID
   * Non-admins receive 404 for INACTIVE services
   * @param {string} serviceId
   * @param {string} [userRole]
   * @returns {Promise<object>}
   */
  async getServiceById(serviceId, userRole = null) {
    this.assertValidObjectId(serviceId);

    const service = await serviceRepository.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found.', 404);
    }

    // Customer visibility rule: INACTIVE services are invisible to non-admins
    if (service.status === SERVICE_STATUS.INACTIVE && userRole !== 'ADMIN') {
      throw new AppError('Service not found.', 404);
    }

    return this.formatServiceResponse(service);
  }

  /**
   * Update an existing service catalogue item (Admin only)
   * @param {string} serviceId
   * @param {string} adminUserId
   * @param {object} updateData
   * @returns {Promise<object>}
   */
  async updateService(serviceId, adminUserId, updateData) {
    this.assertValidObjectId(serviceId);

    const service = await serviceRepository.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found.', 404);
    }

    const payload = {};

    // 1. Name & Slug
    if (updateData.name !== undefined) {
      const trimmedName = updateData.name.trim();
      if (trimmedName !== service.name) {
        const existingName = await serviceRepository.findByName(trimmedName);
        if (existingName && existingName._id.toString() !== serviceId.toString()) {
          throw new AppError('A service with this name already exists.', 409);
        }

        const newSlug = this.generateSlug(trimmedName);
        const existingSlug = await serviceRepository.findBySlug(newSlug);
        if (existingSlug && existingSlug._id.toString() !== serviceId.toString()) {
          throw new AppError('A service with this generated slug already exists.', 409);
        }

        payload.name = trimmedName;
        payload.slug = newSlug;
      }
    }

    // 2. Descriptions
    if (updateData.description !== undefined) {
      payload.description = updateData.description.trim();
    }
    if (updateData.shortDescription !== undefined) {
      payload.shortDescription = updateData.shortDescription ? updateData.shortDescription.trim() : '';
    }

    // 3. Category
    if (updateData.category !== undefined) {
      payload.category = updateData.category.toUpperCase().trim();
    }

    // 4. Vehicle Types
    if (updateData.vehicleTypes !== undefined && Array.isArray(updateData.vehicleTypes)) {
      payload.vehicleTypes = updateData.vehicleTypes.map((t) => t.toUpperCase().trim());
    }

    // 5. Duration & Price
    if (updateData.estimatedDuration !== undefined) {
      payload.estimatedDuration = Number(updateData.estimatedDuration);
    }
    if (updateData.basePrice !== undefined) {
      payload.basePrice = Number(updateData.basePrice);
    }

    // 6. Image, isEmergency, displayOrder, status
    if (updateData.image !== undefined) {
      payload.image = updateData.image ? updateData.image.trim() : null;
    }
    if (updateData.isEmergency !== undefined) {
      payload.isEmergency = Boolean(updateData.isEmergency);
    }
    if (updateData.displayOrder !== undefined) {
      payload.displayOrder = Number(updateData.displayOrder);
    }
    if (updateData.status !== undefined) {
      payload.status = updateData.status.toUpperCase().trim();
    }

    payload.updatedBy = adminUserId || null;

    const updatedService = await serviceRepository.updateById(serviceId, payload);
    return this.formatServiceResponse(updatedService);
  }

  /**
   * Activate or deactivate service (Admin only)
   * @param {string} serviceId
   * @param {string} adminUserId
   * @param {string} status
   * @returns {Promise<object>}
   */
  async updateServiceStatus(serviceId, adminUserId, status) {
    this.assertValidObjectId(serviceId);

    const normalizedStatus = status.toUpperCase().trim();
    if (!Object.values(SERVICE_STATUS).includes(normalizedStatus)) {
      throw new AppError(`Invalid status. Allowed values: ${Object.values(SERVICE_STATUS).join(', ')}.`, 400);
    }

    const service = await serviceRepository.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found.', 404);
    }

    const updated = await serviceRepository.updateStatus(serviceId, normalizedStatus, adminUserId);
    return this.formatServiceResponse(updated);
  }

  /**
   * Safely deactivate (soft-delete) a service (Admin only)
   * @param {string} serviceId
   * @param {string} adminUserId
   * @returns {Promise<{ message: string }>}
   */
  async deactivateService(serviceId, adminUserId) {
    this.assertValidObjectId(serviceId);

    const service = await serviceRepository.findById(serviceId);
    if (!service) {
      throw new AppError('Service not found.', 404);
    }

    if (service.status === SERVICE_STATUS.INACTIVE) {
      throw new AppError('Service is already inactive.', 400);
    }

    await serviceRepository.updateStatus(serviceId, SERVICE_STATUS.INACTIVE, adminUserId);
    return { message: 'Service deactivated successfully.' };
  }
}

module.exports = {
  ServiceService,
  AppError,
  serviceService: new ServiceService(),
};
