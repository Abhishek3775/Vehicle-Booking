const ServicePackage = require('./servicePackage.model');

// Default fields populated when retrieving services within a package
const DEFAULT_SERVICE_POPULATE = {
  path: 'services',
  select: 'name slug description shortDescription category vehicleTypes estimatedDuration basePrice image isEmergency status displayOrder',
};

/**
 * Service Package Repository
 *
 * Encapsulates all direct database queries and persistence logic for the ServicePackage collection.
 * Contains zero HTTP or business logic.
 */
class ServicePackageRepository {
  /**
   * Create a new service package
   * @param {object} packageData
   * @returns {Promise<import('./servicePackage.model')>}
   */
  async create(packageData) {
    const created = await ServicePackage.create(packageData);
    return ServicePackage.findById(created._id).populate(DEFAULT_SERVICE_POPULATE).exec();
  }

  /**
   * Find a package by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} [options]
   * @param {boolean} [options.populateServices=true]
   * @returns {Promise<import('./servicePackage.model')|null>}
   */
  async findById(id, { populateServices = true } = {}) {
    let query = ServicePackage.findById(id);
    if (populateServices) {
      query = query.populate(DEFAULT_SERVICE_POPULATE);
    }
    return query.exec();
  }

  /**
   * Find a package by unique slug
   * @param {string} slug
   * @param {object} [options]
   * @param {boolean} [options.populateServices=true]
   * @returns {Promise<import('./servicePackage.model')|null>}
   */
  async findBySlug(slug, { populateServices = true } = {}) {
    let query = ServicePackage.findOne({ slug: slug.toLowerCase().trim() });
    if (populateServices) {
      query = query.populate(DEFAULT_SERVICE_POPULATE);
    }
    return query.exec();
  }

  /**
   * Find a package by exact name (case-insensitive)
   * @param {string} name
   * @returns {Promise<import('./servicePackage.model')|null>}
   */
  async findByName(name) {
    return ServicePackage.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    }).exec();
  }

  /**
   * Retrieve multiple packages matching query filter with pagination, sorting, and service population
   * @param {object} params
   * @param {object} params.filter
   * @param {object} params.sort
   * @param {number} params.skip
   * @param {number} params.limit
   * @param {boolean} [params.populateServices=true]
   * @returns {Promise<Array<import('./servicePackage.model')>>}
   */
  async findMany({
    filter = {},
    sort = { displayOrder: 1, createdAt: -1 },
    skip = 0,
    limit = 20,
    populateServices = true,
  } = {}) {
    let query = ServicePackage.find(filter).sort(sort).skip(skip).limit(limit);
    if (populateServices) {
      query = query.populate(DEFAULT_SERVICE_POPULATE);
    }
    return query.exec();
  }

  /**
   * Count documents matching filter
   * @param {object} filter
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return ServicePackage.countDocuments(filter).exec();
  }

  /**
   * Update service package by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./servicePackage.model')|null>}
   */
  async updateById(id, updateData) {
    return ServicePackage.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate(DEFAULT_SERVICE_POPULATE)
      .exec();
  }

  /**
   * Update package status
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string} status
   * @param {string|import('mongoose').Types.ObjectId} updatedBy
   * @returns {Promise<import('./servicePackage.model')|null>}
   */
  async updateStatus(id, status, updatedBy = null) {
    const update = { status };
    if (updatedBy) {
      update.updatedBy = updatedBy;
    }
    return ServicePackage.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate(DEFAULT_SERVICE_POPULATE)
      .exec();
  }

  /**
   * Search packages by search term with optional filters
   * Supports partial matching across name, description, and shortDescription
   * @param {object} params
   * @param {string} params.searchTerm
   * @param {object} params.filter
   * @param {object} params.sort
   * @param {number} params.skip
   * @param {number} params.limit
   * @param {boolean} [params.populateServices=true]
   * @returns {Promise<{ packages: Array<import('./servicePackage.model')>, total: number }>}
   */
  async search({
    searchTerm,
    filter = {},
    sort = { displayOrder: 1, createdAt: -1 },
    skip = 0,
    limit = 20,
    populateServices = true,
  } = {}) {
    const combinedFilter = { ...filter };

    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      const escaped = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      combinedFilter.$or = [
        { name: regex },
        { shortDescription: regex },
        { description: regex },
      ];
    }

    let query = ServicePackage.find(combinedFilter).sort(sort).skip(skip).limit(limit);
    if (populateServices) {
      query = query.populate(DEFAULT_SERVICE_POPULATE);
    }

    const [packages, total] = await Promise.all([
      query.exec(),
      ServicePackage.countDocuments(combinedFilter).exec(),
    ]);

    return { packages, total };
  }
}

module.exports = new ServicePackageRepository();
