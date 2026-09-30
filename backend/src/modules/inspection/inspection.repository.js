const Inspection = require('./inspection.model');
const { INSPECTION_STATUS } = require('./inspection.constants');

/**
 * Inspection Repository Layer
 *
 * Encapsulates all direct database queries and atomic operations for the Inspection collection.
 * Pure database layer containing zero HTTP or business logic.
 */
class InspectionRepository {
  /**
   * Create a new inspection record
   * @param {object} inspectionData
   * @returns {Promise<import('./inspection.model')>}
   */
  async create(inspectionData) {
    return Inspection.create(inspectionData);
  }

  /**
   * Find inspection by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} [options]
   * @param {boolean} [options.populateServices=true]
   * @param {boolean} [options.populateDetails=false]
   * @returns {Promise<import('./inspection.model')|null>}
   */
  async findById(id, { populateServices = true, populateDetails = false } = {}) {
    let query = Inspection.findById(id);

    if (populateServices) {
      query = query.populate('recommendedServices.serviceId', 'name category basePrice estimatedDuration');
    }

    if (populateDetails) {
      query = query
        .populate('bookingId', 'bookingReference bookingType scheduledAt status')
        .populate('vehicleId', 'make model registrationNumber vehicleType')
        .populate('userId', 'firstName lastName phone email')
        .populate('mechanicId', 'firstName lastName phone email');
    }

    return query.exec();
  }

  /**
   * Find inspection by unique reference code
   * @param {string} inspectionReference
   * @returns {Promise<import('./inspection.model')|null>}
   */
  async findByReference(inspectionReference) {
    return Inspection.findOne({
      inspectionReference: inspectionReference.toUpperCase().trim(),
    })
      .populate('recommendedServices.serviceId', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Find latest inspection associated with a booking
   * @param {string|import('mongoose').Types.ObjectId} bookingId
   * @returns {Promise<import('./inspection.model')|null>}
   */
  async findByBookingId(bookingId) {
    return Inspection.findOne({ bookingId })
      .sort({ createdAt: -1 })
      .populate('recommendedServices.serviceId', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Find active (IN_PROGRESS or PENDING) inspection for a booking
   * @param {string|import('mongoose').Types.ObjectId} bookingId
   * @returns {Promise<import('./inspection.model')|null>}
   */
  async findActiveByBookingId(bookingId) {
    return Inspection.findOne({
      bookingId,
      status: { $in: [INSPECTION_STATUS.PENDING, INSPECTION_STATUS.IN_PROGRESS] },
    }).exec();
  }

  /**
   * Update inspection document by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./inspection.model')|null>}
   */
  async updateById(id, updateData) {
    return Inspection.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('recommendedServices.serviceId', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Mark inspection as COMPLETED with optional condition notes
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} [params]
   * @param {Date} [params.completedAt=new Date()]
   * @param {string} [params.overallCondition]
   * @param {string} [params.mechanicNotes]
   * @returns {Promise<import('./inspection.model')|null>}
   */
  async completeInspection(id, { completedAt = new Date(), overallCondition, mechanicNotes } = {}) {
    const updateSet = {
      status: INSPECTION_STATUS.COMPLETED,
      completedAt,
    };
    if (overallCondition) updateSet.overallCondition = overallCondition;
    if (mechanicNotes) updateSet.mechanicNotes = mechanicNotes;

    return Inspection.findByIdAndUpdate(
      id,
      { $set: updateSet },
      { new: true, runValidators: true }
    )
      .populate('recommendedServices.serviceId', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Record customer acknowledgement for inspection
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} params
   * @param {string|import('mongoose').Types.ObjectId} params.acknowledgedBy
   * @param {Date} [params.acknowledgedAt=new Date()]
   * @returns {Promise<import('./inspection.model')|null>}
   */
  async acknowledgeInspection(id, { acknowledgedBy, acknowledgedAt = new Date() }) {
    return Inspection.findByIdAndUpdate(
      id,
      {
        $set: {
          customerAcknowledgement: {
            acknowledged: true,
            acknowledgedAt,
            acknowledgedBy,
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate('recommendedServices.serviceId', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Query inspections with filtering, sorting, and pagination
   * @param {object} params
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=10]
   * @returns {Promise<Array<import('./inspection.model')>>}
   */
  async findMany({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10 } = {}) {
    return Inspection.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('recommendedServices.serviceId', 'name category basePrice estimatedDuration')
      .exec();
  }

  /**
   * Count inspections matching filter
   * @param {object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return Inspection.countDocuments(filter).exec();
  }
}

module.exports = new InspectionRepository();
