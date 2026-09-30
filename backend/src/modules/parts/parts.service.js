const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const partsRepository = require('./parts.repository');
const {
  PART_CATEGORIES,
  PART_UNITS,
  PART_STATUS,
  VEHICLE_TYPES,
  STOCK_OPERATIONS,
  PAGINATION_LIMITS,
} = require('./parts.constants');

/**
 * Parts / Inventory Service
 *
 * Implements business logic for managing vehicle spare parts and inventory:
 * - Admin-controlled catalogue lifecycle and pricing
 * - Unique SKU generation, normalization, and collision detection
 * - Dynamic stock and availableQuantity calculation (stockQuantity - reservedQuantity)
 * - Atomic stock adjustments and race-condition-free reservations
 * - Safe release and consumption of reserved stock for service fulfillment
 * - Multi-criteria catalogue discovery with search, category, brand, and low-stock filters
 * - Vehicle-part compatibility matching utility
 * - Safe soft-deactivation preserving historical service records
 */
class PartsService {
  /**
   * Format Part Mongoose document into standardized API response structure
   * @param {import('./parts.model')} part
   * @param {object} [options]
   * @param {string} [options.userRole]
   * @returns {object}
   */
  formatPartResponse(part, { userRole = null } = {}) {
    const stockQuantity = typeof part.stockQuantity === 'number' ? part.stockQuantity : 0;
    const reservedQuantity = typeof part.reservedQuantity === 'number' ? part.reservedQuantity : 0;
    const availableQuantity = Math.max(0, stockQuantity - reservedQuantity);
    const reorderLevel = typeof part.reorderLevel === 'number' ? part.reorderLevel : 5;
    const isLowStock = availableQuantity <= reorderLevel;

    const baseData = {
      id: part._id ? part._id.toString() : part.id,
      name: part.name,
      sku: part.sku,
      partNumber: part.partNumber || null,
      description: part.description,
      category: part.category,
      brand: part.brand,
      compatibleVehicleTypes: part.compatibleVehicleTypes || [],
      compatibleMakes: part.compatibleMakes || [],
      compatibleModels: part.compatibleModels || [],
      unit: part.unit,
      sellingPrice: part.sellingPrice,
      availableQuantity,
      image: part.image || null,
      status: part.status,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
    };

    // Admin view includes sensitive inventory metrics and supplier cost details
    if (userRole === 'ADMIN') {
      return {
        ...baseData,
        costPrice: part.costPrice,
        stockQuantity,
        reservedQuantity,
        reorderLevel,
        isLowStock,
        supplierName: part.supplierName || null,
        createdBy: part.createdBy ? part.createdBy.toString() : null,
        updatedBy: part.updatedBy ? part.updatedBy.toString() : null,
      };
    }

    return baseData;
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='part']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'part') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Determine if a given part is compatible with a vehicle specification
   * @param {object} part
   * @param {object} vehicle
   * @param {string} [vehicle.vehicleType]
   * @param {string} [vehicle.make]
   * @param {string} [vehicle.model]
   * @returns {boolean}
   */
  isPartCompatibleWithVehicle(part, vehicle = {}) {
    if (!part || !vehicle) return false;

    // 1. Vehicle Type check
    if (vehicle.vehicleType) {
      const partTypes = part.compatibleVehicleTypes || [];
      if (partTypes.length > 0 && !partTypes.includes(vehicle.vehicleType.toUpperCase().trim())) {
        return false;
      }
    }

    // 2. Make check
    if (vehicle.make) {
      const partMakes = part.compatibleMakes || [];
      if (partMakes.length > 0) {
        const normalizedVehicleMake = vehicle.make.toLowerCase().trim();
        const makeMatch = partMakes.some((m) => m.toLowerCase().trim() === normalizedVehicleMake);
        if (!makeMatch) return false;
      }
    }

    // 3. Model check
    if (vehicle.model) {
      const partModels = part.compatibleModels || [];
      if (partModels.length > 0) {
        const normalizedVehicleModel = vehicle.model.toLowerCase().trim();
        const modelMatch = partModels.some((m) => m.toLowerCase().trim() === normalizedVehicleModel);
        if (!modelMatch) return false;
      }
    }

    return true;
  }

  /**
   * Create a new part catalogue entry (Admin only)
   * @param {string} adminUserId
   * @param {object} partData
   * @returns {Promise<object>}
   */
  async createPart(adminUserId, partData) {
    const normalizedSku = partData.sku.toUpperCase().trim();

    // 1. Check for duplicate SKU
    const existingSku = await partsRepository.findBySku(normalizedSku);
    if (existingSku) {
      throw new AppError(`A part with SKU '${normalizedSku}' already exists.`, 409);
    }

    // 2. Construct sanitized payload
    const payload = {
      name: partData.name.trim(),
      sku: normalizedSku,
      partNumber: partData.partNumber ? partData.partNumber.trim() : null,
      description: partData.description.trim(),
      category: partData.category.toUpperCase().trim(),
      brand: partData.brand.trim(),
      compatibleVehicleTypes:
        Array.isArray(partData.compatibleVehicleTypes) && partData.compatibleVehicleTypes.length > 0
          ? partData.compatibleVehicleTypes.map((t) => t.toUpperCase().trim())
          : [VEHICLE_TYPES.FOUR_WHEELER],
      compatibleMakes: Array.isArray(partData.compatibleMakes) ? partData.compatibleMakes : [],
      compatibleModels: Array.isArray(partData.compatibleModels) ? partData.compatibleModels : [],
      unit: partData.unit ? partData.unit.toUpperCase().trim() : PART_UNITS.PIECE,
      costPrice: Number(partData.costPrice),
      sellingPrice: Number(partData.sellingPrice),
      stockQuantity: partData.stockQuantity !== undefined ? Number(partData.stockQuantity) : 0,
      reservedQuantity:
        partData.reservedQuantity !== undefined ? Number(partData.reservedQuantity) : 0,
      reorderLevel: partData.reorderLevel !== undefined ? Number(partData.reorderLevel) : 5,
      supplierName: partData.supplierName ? partData.supplierName.trim() : null,
      image: partData.image ? partData.image.trim() : null,
      status: partData.status ? partData.status.toUpperCase().trim() : PART_STATUS.ACTIVE,
      createdBy: adminUserId || null,
      updatedBy: adminUserId || null,
    };

    if (payload.reservedQuantity > payload.stockQuantity) {
      throw new AppError('Reserved quantity cannot exceed initial stock quantity.', 400);
    }

    const newPart = await partsRepository.create(payload);
    return this.formatPartResponse(newPart, { userRole: 'ADMIN' });
  }

  /**
   * Retrieve list of parts with filtering, search, and pagination
   * @param {object} params
   * @param {object} params.query - Request query parameters
   * @param {string} [params.userRole] - Role of authenticated user (e.g. 'ADMIN')
   * @returns {Promise<{ parts: Array<object>, pagination: object }>}
   */
  async getParts({ query = {}, userRole = null } = {}) {
    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    // 1. Status visibility rule:
    // Non-admins only view ACTIVE parts
    if (userRole === 'ADMIN') {
      if (query.status && Object.values(PART_STATUS).includes(query.status.toUpperCase().trim())) {
        filter.status = query.status.toUpperCase().trim();
      }
    } else {
      filter.status = PART_STATUS.ACTIVE;
    }

    // 2. Category filter
    if (query.category) {
      const normalizedCategory = query.category.toUpperCase().trim();
      if (Object.values(PART_CATEGORIES).includes(normalizedCategory)) {
        filter.category = normalizedCategory;
      }
    }

    // 3. Brand filter
    if (query.brand && typeof query.brand === 'string' && query.brand.trim()) {
      filter.brand = { $regex: `^${query.brand.trim()}$`, $options: 'i' };
    }

    // 4. Vehicle type filter
    if (query.vehicleType) {
      const normalizedVehicleType = query.vehicleType.toUpperCase().trim();
      if (Object.values(VEHICLE_TYPES).includes(normalizedVehicleType)) {
        filter.compatibleVehicleTypes = normalizedVehicleType;
      }
    }

    // 5. Low-stock filter: availableQuantity <= reorderLevel
    if (query.lowStock !== undefined && query.lowStock !== '') {
      const isLowStockFilter = String(query.lowStock).toLowerCase() === 'true';
      if (isLowStockFilter) {
        filter.$expr = {
          $lte: [{ $subtract: ['$stockQuantity', '$reservedQuantity'] }, '$reorderLevel'],
        };
      } else {
        filter.$expr = {
          $gt: [{ $subtract: ['$stockQuantity', '$reservedQuantity'] }, '$reorderLevel'],
        };
      }
    }

    // 6. Sorting convention: createdAt descending
    const sort = { createdAt: -1 };

    let parts = [];
    let total = 0;

    // 7. Search term execution or filtered query
    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const result = await partsRepository.search({
        searchTerm: query.search.trim(),
        filter,
        sort,
        skip,
        limit,
      });
      parts = result.parts;
      total = result.total;
    } else {
      [parts, total] = await Promise.all([
        partsRepository.findMany({ filter, sort, skip, limit }),
        partsRepository.count(filter),
      ]);
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      parts: parts.map((part) => this.formatPartResponse(part, { userRole })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve single part details by ID
   * Non-admins receive 404 for INACTIVE parts
   * @param {string} partId
   * @param {string} [userRole]
   * @returns {Promise<object>}
   */
  async getPartById(partId, userRole = null) {
    this.assertValidObjectId(partId);

    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new AppError('Part not found.', 404);
    }

    // Inactive parts are hidden from non-admins
    if (part.status === PART_STATUS.INACTIVE && userRole !== 'ADMIN') {
      throw new AppError('Part not found.', 404);
    }

    return this.formatPartResponse(part, { userRole });
  }

  /**
   * Update part catalogue metadata (Admin only)
   * Note: Stock quantity modifications must use updateStock endpoint.
   * @param {string} partId
   * @param {string} adminUserId
   * @param {object} updateData
   * @returns {Promise<object>}
   */
  async updatePart(partId, adminUserId, updateData) {
    this.assertValidObjectId(partId);

    const existingPart = await partsRepository.findById(partId);
    if (!existingPart) {
      throw new AppError('Part not found.', 404);
    }

    const payload = {};

    // 1. Name
    if (updateData.name !== undefined) {
      payload.name = updateData.name.trim();
    }

    // 2. Part Number
    if (updateData.partNumber !== undefined) {
      payload.partNumber = updateData.partNumber ? updateData.partNumber.trim() : null;
    }

    // 3. Description
    if (updateData.description !== undefined) {
      payload.description = updateData.description.trim();
    }

    // 4. Category
    if (updateData.category !== undefined) {
      payload.category = updateData.category.toUpperCase().trim();
    }

    // 5. Brand
    if (updateData.brand !== undefined) {
      payload.brand = updateData.brand.trim();
    }

    // 6. Compatible Vehicle Types
    if (updateData.compatibleVehicleTypes !== undefined) {
      payload.compatibleVehicleTypes = updateData.compatibleVehicleTypes.map((t) =>
        t.toUpperCase().trim()
      );
    }

    // 7. Compatible Makes & Models
    if (updateData.compatibleMakes !== undefined) {
      payload.compatibleMakes = Array.isArray(updateData.compatibleMakes)
        ? updateData.compatibleMakes
        : [];
    }
    if (updateData.compatibleModels !== undefined) {
      payload.compatibleModels = Array.isArray(updateData.compatibleModels)
        ? updateData.compatibleModels
        : [];
    }

    // 8. Unit
    if (updateData.unit !== undefined) {
      payload.unit = updateData.unit.toUpperCase().trim();
    }

    // 9. Cost & Selling Prices
    if (updateData.costPrice !== undefined) {
      payload.costPrice = Number(updateData.costPrice);
    }
    if (updateData.sellingPrice !== undefined) {
      payload.sellingPrice = Number(updateData.sellingPrice);
    }

    // 10. Reorder Level
    if (updateData.reorderLevel !== undefined) {
      payload.reorderLevel = Number(updateData.reorderLevel);
    }

    // 11. Supplier Name & Image
    if (updateData.supplierName !== undefined) {
      payload.supplierName = updateData.supplierName ? updateData.supplierName.trim() : null;
    }
    if (updateData.image !== undefined) {
      payload.image = updateData.image ? updateData.image.trim() : null;
    }

    // 12. Status
    if (updateData.status !== undefined) {
      payload.status = updateData.status.toUpperCase().trim();
    }

    payload.updatedBy = adminUserId || null;

    const updatedPart = await partsRepository.updateById(partId, payload);
    return this.formatPartResponse(updatedPart, { userRole: 'ADMIN' });
  }

  /**
   * Activate or deactivate part status (Admin only)
   * @param {string} partId
   * @param {string} adminUserId
   * @param {string} status
   * @returns {Promise<object>}
   */
  async updateStatus(partId, adminUserId, status) {
    this.assertValidObjectId(partId);

    const normalizedStatus = status.toUpperCase().trim();
    if (!Object.values(PART_STATUS).includes(normalizedStatus)) {
      throw new AppError(
        `Invalid status. Allowed values: ${Object.values(PART_STATUS).join(', ')}.`,
        400
      );
    }

    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new AppError('Part not found.', 404);
    }

    const updated = await partsRepository.updateStatus(partId, normalizedStatus, adminUserId);
    return this.formatPartResponse(updated, { userRole: 'ADMIN' });
  }

  /**
   * Adjust inventory stock quantity (ADD or REMOVE)
   * Prevents decreasing stock below currently reserved stock.
   * @param {string} partId
   * @param {string} adminUserId
   * @param {object} params
   * @param {number} params.quantity
   * @param {string} params.operation
   * @param {string} params.reason
   * @returns {Promise<object>}
   */
  async updateStock(partId, adminUserId, { quantity, operation, reason }) {
    this.assertValidObjectId(partId);

    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new AppError('Part not found.', 404);
    }

    const qty = Number(quantity);

    if (operation === STOCK_OPERATIONS.REMOVE) {
      if (part.stockQuantity - qty < part.reservedQuantity) {
        throw new AppError(
          `Cannot reduce stock by ${qty}. Total stock (${part.stockQuantity}) cannot be reduced below the currently reserved quantity (${part.reservedQuantity}).`,
          400
        );
      }
    }

    const updated = await partsRepository.adjustStock(partId, {
      quantity: qty,
      operation,
      updatedBy: adminUserId,
    });

    if (!updated) {
      throw new AppError(
        'Stock update failed. The requested reduction violates current inventory reservations.',
        400
      );
    }

    return this.formatPartResponse(updated, { userRole: 'ADMIN' });
  }

  /**
   * Reserve stock quantity for quotation/booking
   * Atomic operation guaranteeing no race conditions on concurrent requests.
   * @param {string} partId
   * @param {string} adminUserId
   * @param {number} quantity
   * @returns {Promise<object>}
   */
  async reserveStock(partId, adminUserId, quantity) {
    this.assertValidObjectId(partId);

    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new AppError('Part not found.', 404);
    }

    if (part.status !== PART_STATUS.ACTIVE) {
      throw new AppError('Cannot reserve stock for an inactive part.', 400);
    }

    const qty = Number(quantity);
    const available = Math.max(0, part.stockQuantity - part.reservedQuantity);
    if (available < qty) {
      throw new AppError(
        `Insufficient available stock. Requested: ${qty}, Available: ${available}.`,
        400
      );
    }

    // Atomic reservation in MongoDB
    const updated = await partsRepository.reserveStock(partId, qty, adminUserId);
    if (!updated) {
      throw new AppError(
        'Stock reservation failed due to concurrent reservation or insufficient stock.',
        400
      );
    }

    return this.formatPartResponse(updated, { userRole: 'ADMIN' });
  }

  /**
   * Release previously reserved stock quantity
   * Atomic operation ensuring release does not exceed current reserved quantity.
   * @param {string} partId
   * @param {string} adminUserId
   * @param {number} quantity
   * @returns {Promise<object>}
   */
  async releaseStock(partId, adminUserId, quantity) {
    this.assertValidObjectId(partId);

    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new AppError('Part not found.', 404);
    }

    const qty = Number(quantity);
    if (part.reservedQuantity < qty) {
      throw new AppError(
        `Cannot release ${qty} units. Currently reserved quantity is only ${part.reservedQuantity}.`,
        400
      );
    }

    // Atomic release in MongoDB
    const updated = await partsRepository.releaseStock(partId, qty, adminUserId);
    if (!updated) {
      throw new AppError(
        'Stock release failed due to concurrent modification or invalid reserved quantity.',
        400
      );
    }

    return this.formatPartResponse(updated, { userRole: 'ADMIN' });
  }

  /**
   * Consume reserved stock quantity (Internal method prepared for future Booking/Service fulfillment)
   * Decreases both stockQuantity and reservedQuantity simultaneously.
   * @param {string} partId
   * @param {number} quantity
   * @param {string} [updatedBy=null]
   * @returns {Promise<object>}
   */
  async consumeStock(partId, quantity, updatedBy = null) {
    this.assertValidObjectId(partId);

    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new AppError('Part not found.', 404);
    }

    const qty = Number(quantity);
    if (part.reservedQuantity < qty || part.stockQuantity < qty) {
      throw new AppError(
        `Cannot consume ${qty} units. Current stock: ${part.stockQuantity}, Reserved: ${part.reservedQuantity}.`,
        400
      );
    }

    // Atomic consumption in MongoDB
    const updated = await partsRepository.consumeStock(partId, qty, updatedBy);
    if (!updated) {
      throw new AppError('Stock consumption failed due to inventory constraints.', 400);
    }

    return this.formatPartResponse(updated, { userRole: 'ADMIN' });
  }

  /**
   * Safely deactivate (soft-delete) a part (Admin only)
   * Preserves database records for past quotations, inspections, and invoices.
   * @param {string} partId
   * @param {string} adminUserId
   * @returns {Promise<{ message: string }>}
   */
  async deactivatePart(partId, adminUserId) {
    this.assertValidObjectId(partId);

    const part = await partsRepository.findById(partId);
    if (!part) {
      throw new AppError('Part not found.', 404);
    }

    if (part.status === PART_STATUS.INACTIVE) {
      throw new AppError('Part is already inactive.', 400);
    }

    await partsRepository.updateStatus(partId, PART_STATUS.INACTIVE, adminUserId);
    return { message: 'Part deactivated successfully.' };
  }
}

module.exports = {
  PartsService,
  AppError,
  partsService: new PartsService(),
};
