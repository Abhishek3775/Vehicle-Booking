const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const servicePackageRepository = require('./servicePackage.repository');
const Service = require('../service/service.model');
const {
  PACKAGE_STATUS,
  VEHICLE_TYPES,
  PACKAGE_CATEGORIES,
  PAGINATION_LIMITS,
} = require('./servicePackage.constants');
const { SERVICE_STATUS } = require('../service/service.constants');

/**
 * Service Layer for Service Packages
 *
 * Implements core business logic for service packages:
 * - Admin-controlled package creation and update
 * - Multi-service bundling with reference integrity validation
 * - Cross-module compatibility verification between package vehicleTypes and individual services
 * - Auto-slug generation and collision detection
 * - Customer catalogue discovery with public active filtering
 * - Inactive service reference preservation with customer-facing active filtering
 * - Safe soft-deletion (deactivation) preserving historical booking integrity
 */
class ServicePackageService {
  /**
   * Format ServicePackage Mongoose document into standardized API response structure
   * @param {import('./servicePackage.model')} packageDoc
   * @param {object} [options]
   * @param {string} [options.userRole]
   * @returns {object}
   */
  formatPackageResponse(packageDoc, { userRole = null } = {}) {
    let servicesFormatted = [];

    if (Array.isArray(packageDoc.services)) {
      servicesFormatted = packageDoc.services
        .filter((s) => {
          if (!s) return false;
          // Unpopulated ObjectId reference
          if (!s.name) return true;
          // Admins see all referenced services (including inactive ones)
          if (userRole === 'ADMIN') return true;
          // Customers only see currently ACTIVE services
          return s.status === SERVICE_STATUS.ACTIVE;
        })
        .map((s) => {
          if (!s.name) {
            return typeof s.toString === 'function' ? s.toString() : s;
          }
          return {
            id: s._id ? s._id.toString() : s.id,
            name: s.name,
            slug: s.slug,
            description: s.description,
            shortDescription: s.shortDescription || '',
            category: s.category,
            vehicleTypes: s.vehicleTypes || [],
            estimatedDuration: s.estimatedDuration,
            basePrice: s.basePrice,
            image: s.image || null,
            isEmergency: Boolean(s.isEmergency),
            status: s.status,
            displayOrder: s.displayOrder ?? 0,
          };
        });
    }

    return {
      id: packageDoc._id ? packageDoc._id.toString() : packageDoc.id,
      name: packageDoc.name,
      slug: packageDoc.slug,
      description: packageDoc.description,
      shortDescription: packageDoc.shortDescription || '',
      category: packageDoc.category,
      vehicleTypes: packageDoc.vehicleTypes || [],
      basePrice: packageDoc.basePrice,
      estimatedDuration: packageDoc.estimatedDuration,
      image: packageDoc.image || null,
      benefits: packageDoc.benefits || [],
      isPopular: Boolean(packageDoc.isPopular),
      displayOrder: packageDoc.displayOrder ?? 0,
      status: packageDoc.status,
      services: servicesFormatted,
      createdBy: packageDoc.createdBy ? packageDoc.createdBy.toString() : null,
      updatedBy: packageDoc.updatedBy ? packageDoc.updatedBy.toString() : null,
      createdAt: packageDoc.createdAt,
      updatedAt: packageDoc.updatedAt,
    };
  }

  /**
   * Generate URL-friendly slug from package name
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
   * @param {string} [entityName='service package']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'service package') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Validate that all referenced service IDs exist in the Service collection
   * and optionally verify that they are active.
   * @param {Array<string>} serviceIds
   * @param {boolean} [requireActive=true]
   * @returns {Promise<Array<import('../service/service.model')>>}
   * @throws {AppError}
   */
  async validateReferencedServices(serviceIds, requireActive = true) {
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new AppError('A service package must include at least one service reference.', 400);
    }

    const objectIds = serviceIds.map((id) => new mongoose.Types.ObjectId(id));
    const foundServices = await Service.find({ _id: { $in: objectIds } }).exec();

    // 1. Verify existence of all referenced services
    if (foundServices.length !== serviceIds.length) {
      const foundIdStrings = new Set(foundServices.map((s) => s._id.toString()));
      const missingIds = serviceIds.filter((id) => !foundIdStrings.has(id.toString()));
      throw new AppError(
        `Referenced service(s) not found: [${missingIds.join(', ')}].`,
        400
      );
    }

    // 2. When creating a package, prefer/require that all referenced services are currently ACTIVE
    if (requireActive) {
      const inactiveServices = foundServices.filter((s) => s.status !== SERVICE_STATUS.ACTIVE);
      if (inactiveServices.length > 0) {
        const inactiveNames = inactiveServices.map((s) => `'${s.name}'`).join(', ');
        throw new AppError(
          `Cannot create package with inactive service(s): ${inactiveNames}. Only active services can be added.`,
          400
        );
      }
    }

    return foundServices;
  }

  /**
   * Validate compatibility between package vehicle types and referenced services.
   * Every referenced service must support all vehicle types specified by the package.
   * @param {Array<import('../service/service.model')>} services
   * @param {Array<string>} packageVehicleTypes
   * @throws {AppError}
   */
  validateVehicleCompatibility(services, packageVehicleTypes) {
    if (!Array.isArray(packageVehicleTypes) || packageVehicleTypes.length === 0) {
      throw new AppError('Package must support at least one vehicle type.', 400);
    }

    for (const service of services) {
      const serviceTypes = service.vehicleTypes || [];
      for (const pType of packageVehicleTypes) {
        if (!serviceTypes.includes(pType)) {
          throw new AppError(
            `Compatibility error: Service '${service.name}' supports [${serviceTypes.join(
              ', '
            )}], which is incompatible with package vehicle type '${pType}'.`,
            400
          );
        }
      }
    }
  }

  /**
   * Create a new service package (Admin only)
   * @param {string} adminUserId
   * @param {object} packageData
   * @returns {Promise<object>}
   */
  async createPackage(adminUserId, packageData) {
    const trimmedName = packageData.name.trim();

    // 1. Check for duplicate package name
    const existingName = await servicePackageRepository.findByName(trimmedName);
    if (existingName) {
      throw new AppError('A service package with this name already exists.', 409);
    }

    // 2. Generate and verify unique slug
    const slug = packageData.slug
      ? this.generateSlug(packageData.slug)
      : this.generateSlug(trimmedName);

    const existingSlug = await servicePackageRepository.findBySlug(slug);
    if (existingSlug) {
      throw new AppError(
        'A service package with this slug already exists. Please choose a different name.',
        409
      );
    }

    // 3. Normalize vehicle types
    const vehicleTypes =
      Array.isArray(packageData.vehicleTypes) && packageData.vehicleTypes.length > 0
        ? packageData.vehicleTypes.map((t) => t.toUpperCase().trim())
        : [VEHICLE_TYPES.FOUR_WHEELER];

    // 4. Validate referenced services & vehicle compatibility
    const services = await this.validateReferencedServices(packageData.services, true);
    this.validateVehicleCompatibility(services, vehicleTypes);

    // 5. Construct sanitized payload
    const payload = {
      name: trimmedName,
      slug,
      description: packageData.description.trim(),
      shortDescription: packageData.shortDescription ? packageData.shortDescription.trim() : '',
      category: packageData.category
        ? packageData.category.toUpperCase().trim()
        : PACKAGE_CATEGORIES.PERIODIC_MAINTENANCE,
      services: packageData.services.map((id) => new mongoose.Types.ObjectId(id)),
      vehicleTypes,
      basePrice: Number(packageData.basePrice),
      estimatedDuration: Number(packageData.estimatedDuration),
      image: packageData.image ? packageData.image.trim() : null,
      benefits: Array.isArray(packageData.benefits) ? packageData.benefits : [],
      isPopular: Boolean(packageData.isPopular),
      displayOrder: packageData.displayOrder !== undefined ? Number(packageData.displayOrder) : 0,
      status: packageData.status ? packageData.status.toUpperCase().trim() : PACKAGE_STATUS.ACTIVE,
      createdBy: adminUserId || null,
      updatedBy: adminUserId || null,
    };

    const newPackage = await servicePackageRepository.create(payload);
    return this.formatPackageResponse(newPackage, { userRole: 'ADMIN' });
  }

  /**
   * Retrieve list of service packages with filtering, search, and pagination
   * Customers and public requests only receive ACTIVE packages
   * @param {object} params
   * @param {object} params.query - Request query parameters
   * @param {string} [params.userRole] - Role of authenticated user (e.g. 'ADMIN')
   * @returns {Promise<{ packages: Array<object>, pagination: object }>}
   */
  async getPackages({ query = {}, userRole = null } = {}) {
    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    // 1. Status visibility rule:
    // Non-admins (customers & public visitors) can ONLY view ACTIVE packages
    if (userRole === 'ADMIN') {
      if (query.status && Object.values(PACKAGE_STATUS).includes(query.status.toUpperCase().trim())) {
        filter.status = query.status.toUpperCase().trim();
      }
    } else {
      filter.status = PACKAGE_STATUS.ACTIVE;
    }

    // 2. Vehicle type filter
    if (query.vehicleType) {
      const normalizedVehicleType = query.vehicleType.toUpperCase().trim();
      if (Object.values(VEHICLE_TYPES).includes(normalizedVehicleType)) {
        filter.vehicleTypes = normalizedVehicleType;
      }
    }

    // 3. Category filter
    if (query.category) {
      const normalizedCategory = query.category.toUpperCase().trim();
      if (Object.values(PACKAGE_CATEGORIES).includes(normalizedCategory)) {
        filter.category = normalizedCategory;
      }
    }

    // 4. isPopular filter
    if (query.isPopular !== undefined && query.isPopular !== '') {
      filter.isPopular = String(query.isPopular).toLowerCase() === 'true';
    }

    // 5. Sorting convention: displayOrder ascending, then createdAt descending
    const sort = { displayOrder: 1, createdAt: -1 };

    let packages = [];
    let total = 0;

    // 6. Search term execution or filtered query
    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const result = await servicePackageRepository.search({
        searchTerm: query.search.trim(),
        filter,
        sort,
        skip,
        limit,
        populateServices: true,
      });
      packages = result.packages;
      total = result.total;
    } else {
      [packages, total] = await Promise.all([
        servicePackageRepository.findMany({
          filter,
          sort,
          skip,
          limit,
          populateServices: true,
        }),
        servicePackageRepository.count(filter),
      ]);
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      packages: packages.map((pkg) => this.formatPackageResponse(pkg, { userRole })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve single service package by ID
   * Non-admins receive 404 for INACTIVE packages
   * @param {string} packageId
   * @param {string} [userRole]
   * @returns {Promise<object>}
   */
  async getPackageById(packageId, userRole = null) {
    this.assertValidObjectId(packageId);

    const packageDoc = await servicePackageRepository.findById(packageId, {
      populateServices: true,
    });
    if (!packageDoc) {
      throw new AppError('Service package not found.', 404);
    }

    // Customer visibility rule: INACTIVE packages are hidden from non-admins
    if (packageDoc.status === PACKAGE_STATUS.INACTIVE && userRole !== 'ADMIN') {
      throw new AppError('Service package not found.', 404);
    }

    return this.formatPackageResponse(packageDoc, { userRole });
  }

  /**
   * Update an existing service package (Admin only)
   * @param {string} packageId
   * @param {string} adminUserId
   * @param {object} updateData
   * @returns {Promise<object>}
   */
  async updatePackage(packageId, adminUserId, updateData) {
    this.assertValidObjectId(packageId);

    const existingPackage = await servicePackageRepository.findById(packageId, {
      populateServices: false,
    });
    if (!existingPackage) {
      throw new AppError('Service package not found.', 404);
    }

    const payload = {};

    // 1. Name & Slug
    if (updateData.name !== undefined) {
      const trimmedName = updateData.name.trim();
      if (trimmedName !== existingPackage.name) {
        const existingName = await servicePackageRepository.findByName(trimmedName);
        if (existingName && existingName._id.toString() !== packageId.toString()) {
          throw new AppError('A service package with this name already exists.', 409);
        }

        const newSlug = this.generateSlug(trimmedName);
        const existingSlug = await servicePackageRepository.findBySlug(newSlug);
        if (existingSlug && existingSlug._id.toString() !== packageId.toString()) {
          throw new AppError('A service package with this generated slug already exists.', 409);
        }

        payload.name = trimmedName;
        payload.slug = newSlug;
      }
    }

    // 2. Descriptions & Category
    if (updateData.description !== undefined) {
      payload.description = updateData.description.trim();
    }
    if (updateData.shortDescription !== undefined) {
      payload.shortDescription = updateData.shortDescription
        ? updateData.shortDescription.trim()
        : '';
    }
    if (updateData.category !== undefined) {
      payload.category = updateData.category.toUpperCase().trim();
    }

    // 3. Target vehicleTypes and services resolution
    const targetVehicleTypes =
      updateData.vehicleTypes !== undefined
        ? updateData.vehicleTypes.map((t) => t.toUpperCase().trim())
        : existingPackage.vehicleTypes;

    const targetServiceIds =
      updateData.services !== undefined
        ? updateData.services.map((id) => id.toString())
        : existingPackage.services.map((id) => id.toString());

    // If either services or vehicleTypes changed, validate compatibility
    if (updateData.services !== undefined || updateData.vehicleTypes !== undefined) {
      // For updates, we allow existing inactive services to remain attached if not changing services,
      // but if explicit new services are passed, require active services
      const requireActive = updateData.services !== undefined;
      const validatedServices = await this.validateReferencedServices(
        targetServiceIds,
        requireActive
      );
      this.validateVehicleCompatibility(validatedServices, targetVehicleTypes);

      if (updateData.services !== undefined) {
        payload.services = targetServiceIds.map((id) => new mongoose.Types.ObjectId(id));
      }
      if (updateData.vehicleTypes !== undefined) {
        payload.vehicleTypes = targetVehicleTypes;
      }
    }

    // 4. Base Price & Estimated Duration
    if (updateData.basePrice !== undefined) {
      payload.basePrice = Number(updateData.basePrice);
    }
    if (updateData.estimatedDuration !== undefined) {
      payload.estimatedDuration = Number(updateData.estimatedDuration);
    }

    // 5. Image, Benefits, isPopular, displayOrder, status
    if (updateData.image !== undefined) {
      payload.image = updateData.image ? updateData.image.trim() : null;
    }
    if (updateData.benefits !== undefined) {
      payload.benefits = Array.isArray(updateData.benefits) ? updateData.benefits : [];
    }
    if (updateData.isPopular !== undefined) {
      payload.isPopular = Boolean(updateData.isPopular);
    }
    if (updateData.displayOrder !== undefined) {
      payload.displayOrder = Number(updateData.displayOrder);
    }
    if (updateData.status !== undefined) {
      payload.status = updateData.status.toUpperCase().trim();
    }

    payload.updatedBy = adminUserId || null;

    const updatedPackage = await servicePackageRepository.updateById(packageId, payload);
    return this.formatPackageResponse(updatedPackage, { userRole: 'ADMIN' });
  }

  /**
   * Activate or deactivate package (Admin only)
   * @param {string} packageId
   * @param {string} adminUserId
   * @param {string} status
   * @returns {Promise<object>}
   */
  async updatePackageStatus(packageId, adminUserId, status) {
    this.assertValidObjectId(packageId);

    const normalizedStatus = status.toUpperCase().trim();
    if (!Object.values(PACKAGE_STATUS).includes(normalizedStatus)) {
      throw new AppError(
        `Invalid status. Allowed values: ${Object.values(PACKAGE_STATUS).join(', ')}.`,
        400
      );
    }

    const pkg = await servicePackageRepository.findById(packageId, { populateServices: false });
    if (!pkg) {
      throw new AppError('Service package not found.', 404);
    }

    const updated = await servicePackageRepository.updateStatus(
      packageId,
      normalizedStatus,
      adminUserId
    );
    return this.formatPackageResponse(updated, { userRole: 'ADMIN' });
  }

  /**
   * Safely deactivate (soft-delete) a service package (Admin only)
   * Preserves database records for past bookings, quotations, and invoices.
   * @param {string} packageId
   * @param {string} adminUserId
   * @returns {Promise<{ message: string }>}
   */
  async deactivatePackage(packageId, adminUserId) {
    this.assertValidObjectId(packageId);

    const pkg = await servicePackageRepository.findById(packageId, { populateServices: false });
    if (!pkg) {
      throw new AppError('Service package not found.', 404);
    }

    if (pkg.status === PACKAGE_STATUS.INACTIVE) {
      throw new AppError('Service package is already inactive.', 400);
    }

    await servicePackageRepository.updateStatus(packageId, PACKAGE_STATUS.INACTIVE, adminUserId);
    return { message: 'Service package deactivated successfully.' };
  }
}

module.exports = {
  ServicePackageService,
  AppError,
  servicePackageService: new ServicePackageService(),
};
