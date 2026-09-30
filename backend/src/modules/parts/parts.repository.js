const Part = require('./parts.model');
const { PART_STATUS, STOCK_OPERATIONS } = require('./parts.constants');

/**
 * Parts / Inventory Repository
 *
 * Encapsulates all direct database persistence, atomic inventory updates,
 * and querying for the Part collection.
 * Contains zero HTTP or business logic.
 */
class PartsRepository {
  /**
   * Create a new part entry in the database
   * @param {object} partData
   * @returns {Promise<import('./parts.model')>}
   */
  async create(partData) {
    return Part.create(partData);
  }

  /**
   * Find part by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./parts.model')|null>}
   */
  async findById(id) {
    return Part.findById(id).exec();
  }

  /**
   * Find part by unique SKU
   * @param {string} sku
   * @returns {Promise<import('./parts.model')|null>}
   */
  async findBySku(sku) {
    return Part.findOne({ sku: sku.toUpperCase().trim() }).exec();
  }

  /**
   * Find part by exact name (case-insensitive)
   * @param {string} name
   * @returns {Promise<import('./parts.model')|null>}
   */
  async findByName(name) {
    return Part.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    }).exec();
  }

  /**
   * Retrieve multiple parts matching query filter with pagination and sorting
   * @param {object} params
   * @param {object} params.filter
   * @param {object} params.sort
   * @param {number} params.skip
   * @param {number} params.limit
   * @returns {Promise<Array<import('./parts.model')>>}
   */
  async findMany({
    filter = {},
    sort = { createdAt: -1 },
    skip = 0,
    limit = 20,
  } = {}) {
    return Part.find(filter).sort(sort).skip(skip).limit(limit).exec();
  }

  /**
   * Count documents matching filter
   * @param {object} filter
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return Part.countDocuments(filter).exec();
  }

  /**
   * Update part metadata by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./parts.model')|null>}
   */
  async updateById(id, updateData) {
    return Part.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Update part status
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string} status
   * @param {string|import('mongoose').Types.ObjectId} [updatedBy=null]
   * @returns {Promise<import('./parts.model')|null>}
   */
  async updateStatus(id, status, updatedBy = null) {
    const update = { status };
    if (updatedBy) {
      update.updatedBy = updatedBy;
    }
    return Part.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Atomic stock quantity adjustment (ADD or REMOVE)
   * Prevents removing stock below the currently reserved quantity.
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} params
   * @param {number} params.quantity
   * @param {string} params.operation - 'ADD' or 'REMOVE'
   * @param {string} [params.updatedBy]
   * @returns {Promise<import('./parts.model')|null>}
   */
  async adjustStock(id, { quantity, operation, updatedBy = null }) {
    if (operation === STOCK_OPERATIONS.ADD) {
      const update = {
        $inc: { stockQuantity: quantity },
      };
      if (updatedBy) {
        update.$set = { updatedBy };
      }
      return Part.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
    }

    if (operation === STOCK_OPERATIONS.REMOVE) {
      // Atomic condition: new stockQuantity (stockQuantity - quantity) must be >= reservedQuantity
      const update = {
        $inc: { stockQuantity: -quantity },
      };
      if (updatedBy) {
        update.$set = { updatedBy };
      }

      return Part.findOneAndUpdate(
        {
          _id: id,
          $expr: {
            $gte: [{ $subtract: ['$stockQuantity', quantity] }, '$reservedQuantity'],
          },
        },
        update,
        { new: true, runValidators: true }
      ).exec();
    }

    return null;
  }

  /**
   * Atomic stock reservation
   * Ensures part is ACTIVE and available stock (stockQuantity - reservedQuantity) >= requested quantity.
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {number} quantity
   * @param {string|import('mongoose').Types.ObjectId} [updatedBy=null]
   * @returns {Promise<import('./parts.model')|null>}
   */
  async reserveStock(id, quantity, updatedBy = null) {
    const update = {
      $inc: { reservedQuantity: quantity },
    };
    if (updatedBy) {
      update.$set = { updatedBy };
    }

    return Part.findOneAndUpdate(
      {
        _id: id,
        status: PART_STATUS.ACTIVE,
        $expr: {
          $gte: [{ $subtract: ['$stockQuantity', '$reservedQuantity'] }, quantity],
        },
      },
      update,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Atomic stock release
   * Releases previously reserved stock without altering total stockQuantity.
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {number} quantity
   * @param {string|import('mongoose').Types.ObjectId} [updatedBy=null]
   * @returns {Promise<import('./parts.model')|null>}
   */
  async releaseStock(id, quantity, updatedBy = null) {
    const update = {
      $inc: { reservedQuantity: -quantity },
    };
    if (updatedBy) {
      update.$set = { updatedBy };
    }

    return Part.findOneAndUpdate(
      {
        _id: id,
        reservedQuantity: { $gte: quantity },
      },
      update,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Atomic stock consumption (Internal preparation for future Booking/Service fulfillment)
   * Decrements both total stockQuantity and reservedQuantity simultaneously.
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {number} quantity
   * @param {string|import('mongoose').Types.ObjectId} [updatedBy=null]
   * @returns {Promise<import('./parts.model')|null>}
   */
  async consumeStock(id, quantity, updatedBy = null) {
    const update = {
      $inc: {
        stockQuantity: -quantity,
        reservedQuantity: -quantity,
      },
    };
    if (updatedBy) {
      update.$set = { updatedBy };
    }

    return Part.findOneAndUpdate(
      {
        _id: id,
        stockQuantity: { $gte: quantity },
        reservedQuantity: { $gte: quantity },
      },
      update,
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Search parts across name, SKU, partNumber, brand, and description
   * @param {object} params
   * @param {string} params.searchTerm
   * @param {object} params.filter
   * @param {object} params.sort
   * @param {number} params.skip
   * @param {number} params.limit
   * @returns {Promise<{ parts: Array<import('./parts.model')>, total: number }>}
   */
  async search({
    searchTerm,
    filter = {},
    sort = { createdAt: -1 },
    skip = 0,
    limit = 20,
  } = {}) {
    const combinedFilter = { ...filter };

    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      combinedFilter.$or = [
        { name: regex },
        { sku: regex },
        { partNumber: regex },
        { brand: regex },
        { description: regex },
      ];
    }

    const [parts, total] = await Promise.all([
      Part.find(combinedFilter).sort(sort).skip(skip).limit(limit).exec(),
      Part.countDocuments(combinedFilter).exec(),
    ]);

    return { parts, total };
  }
}

module.exports = new PartsRepository();
