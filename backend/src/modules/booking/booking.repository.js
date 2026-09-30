const Booking = require('./booking.model');
const { BOOKING_STATUS } = require('./booking.constants');

/**
 * Booking Repository
 *
 * Encapsulates all direct database persistence and query logic for the Booking collection.
 * Contains zero HTTP or business rules.
 */
class BookingRepository {
  /**
   * Create a new booking document
   * @param {object} bookingData
   * @returns {Promise<import('./booking.model')>}
   */
  async create(bookingData) {
    return Booking.create(bookingData);
  }

  /**
   * Find booking by its MongoDB _id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @returns {Promise<import('./booking.model')|null>}
   */
  async findById(id) {
    return Booking.findById(id).exec();
  }

  /**
   * Find booking by _id and userId (Ownership-scoped query)
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @returns {Promise<import('./booking.model')|null>}
   */
  async findByIdAndUser(id, userId) {
    return Booking.findOne({ _id: id, userId }).exec();
  }

  /**
   * Find booking by its unique human-readable booking reference
   * @param {string} bookingReference
   * @returns {Promise<import('./booking.model')|null>}
   */
  async findByReference(bookingReference) {
    return Booking.findOne({
      bookingReference: bookingReference.toUpperCase().trim(),
    }).exec();
  }

  /**
   * Retrieve paginated bookings belonging to a specific user with filtering and sorting
   * @param {object} params
   * @param {string|import('mongoose').Types.ObjectId} params.userId
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=10]
   * @returns {Promise<Array<import('./booking.model')>>}
   */
  async findUserBookings({
    userId,
    filter = {},
    sort = { createdAt: -1 },
    skip = 0,
    limit = 10,
  } = {}) {
    const combinedFilter = { ...filter, userId };
    return Booking.find(combinedFilter).sort(sort).skip(skip).limit(limit).exec();
  }

  /**
   * Count total bookings belonging to a specific user with filtering
   * @param {object} params
   * @param {string|import('mongoose').Types.ObjectId} params.userId
   * @param {object} [params.filter={}]
   * @returns {Promise<number>}
   */
  async countUserBookings({ userId, filter = {} } = {}) {
    const combinedFilter = { ...filter, userId };
    return Booking.countDocuments(combinedFilter).exec();
  }

  /**
   * Cancel booking atomically scoped to owner user
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {string|import('mongoose').Types.ObjectId} userId
   * @param {object} params
   * @param {string} params.cancellationReason
   * @param {Date} params.cancelledAt
   * @returns {Promise<import('./booking.model')|null>}
   */
  async cancelBooking(id, userId, { cancellationReason, cancelledAt }) {
    return Booking.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancellationReason,
          cancelledBy: userId,
          cancelledAt: cancelledAt || new Date(),
        },
      },
      { new: true, runValidators: true }
    ).exec();
  }
}

module.exports = new BookingRepository();
