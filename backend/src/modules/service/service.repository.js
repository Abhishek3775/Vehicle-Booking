const Service = require('./service.model');

/**
 * Service Repository
 *
 * Encapsulates all direct database operations for the Service collection.
 * Contains zero HTTP or business logic.
 */
class ServiceRepository {
  /**
   * Create a new service catalogue entry
   * @param {object} serviceData
   * @returns {Promise<import('./service.model')>}
   */
  async create(serviceData) {
    return Service.create(serviceData);
  }

  /**
   * Find a service by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./service.model')|null>}
   */
  async findById(id) {
    return Service.findById(id).exec();
  }

  /**
   * Find a service by unique slug
   * @param {string} slug
   * @returns {Promise<import('./service.model')|null>}
   */
  async findBySlug(slug) {
    return Service.findOne({ slug: slug.toLowerCase().trim() }).exec();
  }

  /**
   * Find a service by exact name (case-insensitive)
   * @param {string} name
   * @returns {Promise<import('./service.model')|null>}
   */
  async findByName(name) {
    return Service.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } }).exec();
  }

  /**
   * Retrieve multiple services matching query filter with pagination and sorting
   * @param {object} params
   * @param {object} params.filter
   * @param {object} params.sort
   * @param {number} params.skip
   * @param {number} params.limit
   * @returns {Promise<Array<import('./service.model')>>}
   */
  async findMany({ filter = {}, sort = { displayOrder: 1, createdAt: -1 }, skip = 0, limit = 20 } = {}) {
    return Service.find(filter).sort(sort).skip(skip).limit(limit).exec();
  }

  /**
   * Count documents matching filter
   * @param {object} filter
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return Service.countDocuments(filter).exec();
  }

  /**
   * Update service by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./service.model')|null>}
   */
  async updateById(id, updateData) {
    return Service.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Update service status
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string} status
   * @param {string|import('mongoose').Types.ObjectId} updatedBy
   * @returns {Promise<import('./service.model')|null>}
   */
  async updateStatus(id, status, updatedBy = null) {
    const update = { status };
    if (updatedBy) {
      update.updatedBy = updatedBy;
    }
    return Service.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Search services by search term with optional filters
   * Supports partial matching across name, descriptions, and category
   * @param {object} params
   * @param {string} params.searchTerm
   * @param {object} params.filter
   * @param {object} params.sort
   * @param {number} params.skip
   * @param {number} params.limit
   * @returns {Promise<{ services: Array<import('./service.model')>, total: number }>}
   */
  async search({ searchTerm, filter = {}, sort = { displayOrder: 1, createdAt: -1 }, skip = 0, limit = 20 } = {}) {
    const combinedFilter = { ...filter };

    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      combinedFilter.$or = [
        { name: regex },
        { shortDescription: regex },
        { description: regex },
        { category: regex },
      ];
    }

    const [services, total] = await Promise.all([
      Service.find(combinedFilter).sort(sort).skip(skip).limit(limit).exec(),
      Service.countDocuments(combinedFilter).exec(),
    ]);

    return { services, total };
  }
}

module.exports = new ServiceRepository();
