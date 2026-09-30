const Quotation = require('./quotation.model');
const { QUOTATION_STATUS, CUSTOMER_RESPONSE } = require('./quotation.constants');

/**
 * Quotation Repository Layer
 *
 * Encapsulates direct database operations for the Quotation collection.
 * Pure database layer containing zero HTTP or business logic.
 */
class QuotationRepository {
  /**
   * Create a new quotation record
   * @param {object} quotationData
   * @returns {Promise<import('./quotation.model')>}
   */
  async create(quotationData) {
    return Quotation.create(quotationData);
  }

  /**
   * Find quotation by MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} [options]
   * @param {boolean} [options.populateDetails=false]
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async findById(id, { populateDetails = false } = {}) {
    let query = Quotation.findById(id);

    if (populateDetails) {
      query = query
        .populate('bookingId', 'bookingReference bookingType scheduledAt status')
        .populate('inspectionId', 'inspectionReference overallCondition')
        .populate('vehicleId', 'make model registrationNumber vehicleType')
        .populate('userId', 'firstName lastName phone email')
        .populate('mechanicId', 'firstName lastName phone email')
        .populate('items.serviceId', 'name category basePrice estimatedDuration');
    }

    return query.exec();
  }

  /**
   * Find quotation by unique quotation reference
   * @param {string} quotationReference
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async findByReference(quotationReference) {
    return Quotation.findOne({
      quotationReference: quotationReference.toUpperCase().trim(),
    }).exec();
  }

  /**
   * Find all quotations associated with a booking sorted by version descending
   * @param {string|import('mongoose').Types.ObjectId} bookingId
   * @returns {Promise<Array<import('./quotation.model')>>}
   */
  async findByBookingId(bookingId) {
    return Quotation.find({ bookingId })
      .sort({ version: -1, createdAt: -1 })
      .exec();
  }

  /**
   * Find latest quotation for a booking
   * @param {string|import('mongoose').Types.ObjectId} bookingId
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async findLatestByBookingId(bookingId) {
    return Quotation.findOne({ bookingId })
      .sort({ version: -1, createdAt: -1 })
      .exec();
  }

  /**
   * Find active quotation (DRAFT or PENDING_APPROVAL) for a booking
   * @param {string|import('mongoose').Types.ObjectId} bookingId
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async findActiveByBookingId(bookingId) {
    return Quotation.findOne({
      bookingId,
      status: { $in: [QUOTATION_STATUS.DRAFT, QUOTATION_STATUS.PENDING_APPROVAL] },
    }).exec();
  }

  /**
   * Update quotation by _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} updateData
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async updateById(id, updateData) {
    return Quotation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Mark quotation as submitted for customer approval
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async submitQuotation(id) {
    return Quotation.findByIdAndUpdate(
      id,
      {
        $set: {
          status: QUOTATION_STATUS.PENDING_APPROVAL,
          customerResponse: CUSTOMER_RESPONSE.PENDING,
        },
      },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Mark quotation as approved by customer
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {Date} [approvedAt=new Date()]
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async approveQuotation(id, approvedAt = new Date()) {
    return Quotation.findByIdAndUpdate(
      id,
      {
        $set: {
          status: QUOTATION_STATUS.APPROVED,
          customerResponse: CUSTOMER_RESPONSE.APPROVED,
          customerResponseAt: approvedAt,
          approvedAt,
        },
      },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Mark quotation as rejected by customer
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {object} params
   * @param {string} params.rejectionReason
   * @param {Date} [params.rejectedAt=new Date()]
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async rejectQuotation(id, { rejectionReason, rejectedAt = new Date() }) {
    return Quotation.findByIdAndUpdate(
      id,
      {
        $set: {
          status: QUOTATION_STATUS.REJECTED,
          customerResponse: CUSTOMER_RESPONSE.REJECTED,
          customerResponseAt: rejectedAt,
          rejectionReason,
          rejectedAt,
        },
      },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Mark quotation as expired
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./quotation.model')|null>}
   */
  async markExpired(id) {
    return Quotation.findByIdAndUpdate(
      id,
      {
        $set: {
          status: QUOTATION_STATUS.EXPIRED,
        },
      },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Query quotations with filtering, sorting, and pagination
   * @param {object} params
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=10]
   * @returns {Promise<Array<import('./quotation.model')>>}
   */
  async findMany({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10 } = {}) {
    return Quotation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Count quotations matching filter
   * @param {object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return Quotation.countDocuments(filter).exec();
  }
}

module.exports = new QuotationRepository();
