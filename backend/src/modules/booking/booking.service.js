const crypto = require('crypto');
const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const bookingRepository = require('./booking.repository');
const Vehicle = require('../vehicle/vehicle.model');
const Address = require('../address/address.model');
const Service = require('../service/service.model');
const ServicePackage = require('../service-package/servicePackage.model');
const {
  BOOKING_TYPES,
  BOOKING_STATUS,
  CANCELLABLE_STATUSES,
  PAGINATION_LIMITS,
} = require('./booking.constants');
const { VEHICLE_STATUS } = require('../vehicle/vehicle.constants');
const { ADDRESS_STATUS } = require('../address/address.constants');
const { SERVICE_STATUS } = require('../service/service.constants');
const { PACKAGE_STATUS } = require('../service-package/servicePackage.constants');

/**
 * Booking Service Layer
 *
 * Implements business logic for managing vehicle service bookings:
 * - Vehicle and address ownership and active status validation
 * - Vehicle-to-service and vehicle-to-package compatibility verification
 * - Point-in-time snapshot creation (address, location, vehicle, service, package)
 * - Unique human-readable booking reference generation (e.g. BK-YYYYMMDD-XXXX)
 * - Safe user-scoped customer query filtering
 * - Strict cancellation workflow restrictions
 */
class BookingService {
  /**
   * Format Booking Mongoose document into standardized API response structure
   * @param {import('./booking.model')} booking
   * @returns {object}
   */
  formatBookingResponse(booking) {
    return {
      id: booking._id ? booking._id.toString() : booking.id,
      bookingReference: booking.bookingReference,
      userId: booking.userId ? booking.userId.toString() : null,
      vehicleId: booking.vehicleId ? booking.vehicleId.toString() : null,
      serviceId: booking.serviceId ? booking.serviceId.toString() : null,
      servicePackageId: booking.servicePackageId ? booking.servicePackageId.toString() : null,
      bookingType: booking.bookingType,
      scheduledAt: booking.scheduledAt,
      addressId: booking.addressId ? booking.addressId.toString() : null,
      locationSnapshot: booking.locationSnapshot || null,
      addressSnapshot: booking.addressSnapshot || null,
      vehicleSnapshot: booking.vehicleSnapshot || null,
      serviceSnapshot: booking.serviceSnapshot || null,
      packageSnapshot: booking.packageSnapshot || null,
      customerNotes: booking.customerNotes || '',
      status: booking.status,
      cancellationReason: booking.cancellationReason || null,
      cancelledBy: booking.cancelledBy ? booking.cancelledBy.toString() : null,
      cancelledAt: booking.cancelledAt || null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='booking']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'booking') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Generate unique human-readable booking reference
   * Format: BK-YYYYMMDD-XXXX (e.g. BK-20260926-A1B2)
   * @returns {Promise<string>}
   */
  async generateBookingReference() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;

    // Retry loop to ensure reference uniqueness under high concurrency
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const reference = `BK-${datePart}-${randomSuffix}`;

      const existing = await bookingRepository.findByReference(reference);
      if (!existing) {
        return reference;
      }
    }

    // Fallback using timestamp suffix
    const fallbackSuffix = Date.now().toString(36).toUpperCase().slice(-4);
    return `BK-${datePart}-${fallbackSuffix}`;
  }

  /**
   * Create a new booking (Authenticated customer only)
   * @param {string} userId - Authenticated user ID from token
   * @param {object} bookingData - Validated payload
   * @returns {Promise<object>}
   */
  async createBooking(userId, bookingData) {
    this.assertValidObjectId(userId, 'user');
    this.assertValidObjectId(bookingData.vehicleId, 'vehicle');

    // 1. Validate vehicle existence, ownership, and active lifecycle
    const vehicle = await Vehicle.findOne({ _id: bookingData.vehicleId, userId }).exec();
    if (!vehicle) {
      throw new AppError(
        'Vehicle not found or does not belong to your account.',
        404
      );
    }

    if (vehicle.status !== VEHICLE_STATUS.ACTIVE) {
      throw new AppError('The selected vehicle is inactive and cannot be booked.', 400);
    }

    const vehicleSnapshot = {
      vehicleId: vehicle._id,
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant || '',
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      fuelType: vehicle.fuelType,
    };

    // 2. Validate saved address if provided
    let addressSnapshot = null;
    if (bookingData.addressId) {
      this.assertValidObjectId(bookingData.addressId, 'address');
      const address = await Address.findOne({ _id: bookingData.addressId, userId }).exec();
      if (!address) {
        throw new AppError(
          'Address not found or does not belong to your account.',
          404
        );
      }

      if (address.status !== ADDRESS_STATUS.ACTIVE) {
        throw new AppError('The selected address is inactive and cannot be used.', 400);
      }

      addressSnapshot = {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        landmark: address.landmark || '',
        city: address.city,
        state: address.state,
        country: address.country || 'India',
        postalCode: address.postalCode,
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      };
    }

    // 3. Location snapshot for emergency / roadside requests
    let locationSnapshot = null;
    if (bookingData.location && typeof bookingData.location === 'object') {
      locationSnapshot = {
        latitude: bookingData.location.latitude !== undefined ? Number(bookingData.location.latitude) : null,
        longitude: bookingData.location.longitude !== undefined ? Number(bookingData.location.longitude) : null,
        addressText: bookingData.location.addressText ? bookingData.location.addressText.trim() : '',
      };
    }

    // 4. Validate Individual Service OR Service Package
    let serviceSnapshot = null;
    let packageSnapshot = null;

    if (bookingData.serviceId) {
      this.assertValidObjectId(bookingData.serviceId, 'service');
      const service = await Service.findById(bookingData.serviceId).exec();
      if (!service) {
        throw new AppError('The requested service does not exist.', 404);
      }

      if (service.status !== SERVICE_STATUS.ACTIVE) {
        throw new AppError('The requested service is currently inactive.', 400);
      }

      // Check compatibility between vehicle type and service vehicleTypes
      const serviceTypes = service.vehicleTypes || [];
      if (!serviceTypes.includes(vehicle.vehicleType)) {
        throw new AppError(
          `Service '${service.name}' supports [${serviceTypes.join(
            ', '
          )}], which is incompatible with your vehicle type (${vehicle.vehicleType}).`,
          400
        );
      }

      serviceSnapshot = {
        serviceId: service._id,
        name: service.name,
        shortDescription: service.shortDescription || '',
        category: service.category,
        basePrice: service.basePrice,
        estimatedDuration: service.estimatedDuration,
      };
    } else if (bookingData.servicePackageId) {
      this.assertValidObjectId(bookingData.servicePackageId, 'service package');
      const pkg = await ServicePackage.findById(bookingData.servicePackageId).exec();
      if (!pkg) {
        throw new AppError('The requested service package does not exist.', 404);
      }

      if (pkg.status !== PACKAGE_STATUS.ACTIVE) {
        throw new AppError('The requested service package is currently inactive.', 400);
      }

      // Check compatibility between vehicle type and package vehicleTypes
      const pkgTypes = pkg.vehicleTypes || [];
      if (!pkgTypes.includes(vehicle.vehicleType)) {
        throw new AppError(
          `Service package '${pkg.name}' supports [${pkgTypes.join(
            ', '
          )}], which is incompatible with your vehicle type (${vehicle.vehicleType}).`,
          400
        );
      }

      packageSnapshot = {
        packageId: pkg._id,
        name: pkg.name,
        shortDescription: pkg.shortDescription || '',
        category: pkg.category,
        basePrice: pkg.basePrice,
        estimatedDuration: pkg.estimatedDuration,
      };
    }

    // 5. Generate unique booking reference
    const bookingReference = await this.generateBookingReference();

    // 6. Assemble complete booking payload
    const payload = {
      bookingReference,
      userId: new mongoose.Types.ObjectId(userId),
      vehicleId: new mongoose.Types.ObjectId(bookingData.vehicleId),
      serviceId: bookingData.serviceId ? new mongoose.Types.ObjectId(bookingData.serviceId) : null,
      servicePackageId: bookingData.servicePackageId
        ? new mongoose.Types.ObjectId(bookingData.servicePackageId)
        : null,
      bookingType: bookingData.bookingType || BOOKING_TYPES.SCHEDULED,
      scheduledAt: bookingData.scheduledAt || null,
      addressId: bookingData.addressId ? new mongoose.Types.ObjectId(bookingData.addressId) : null,
      locationSnapshot,
      addressSnapshot,
      vehicleSnapshot,
      serviceSnapshot,
      packageSnapshot,
      customerNotes: bookingData.customerNotes ? bookingData.customerNotes.trim() : '',
      status: BOOKING_STATUS.PENDING,
    };

    const newBooking = await bookingRepository.create(payload);
    return this.formatBookingResponse(newBooking);
  }

  /**
   * Retrieve list of bookings belonging strictly to the authenticated customer
   * @param {object} params
   * @param {string} params.userId
   * @param {object} params.query
   * @returns {Promise<{ bookings: Array<object>, pagination: object }>}
   */
  async getUserBookings({ userId, query = {} } = {}) {
    this.assertValidObjectId(userId, 'user');

    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    // 1. Status filter
    if (query.status) {
      const normalizedStatus = query.status.toUpperCase().trim();
      if (Object.values(BOOKING_STATUS).includes(normalizedStatus)) {
        filter.status = normalizedStatus;
      }
    }

    // 2. Booking type filter
    if (query.bookingType) {
      const normalizedType = query.bookingType.toUpperCase().trim();
      if (Object.values(BOOKING_TYPES).includes(normalizedType)) {
        filter.bookingType = normalizedType;
      }
    }

    // 3. Vehicle ID filter
    if (query.vehicleId && mongoose.Types.ObjectId.isValid(query.vehicleId.trim())) {
      filter.vehicleId = query.vehicleId.trim();
    }

    // 4. Scheduled date range filter
    if (query.fromScheduledAt || query.toScheduledAt) {
      filter.scheduledAt = {};
      if (query.fromScheduledAt) {
        const fromDate = new Date(query.fromScheduledAt);
        if (!isNaN(fromDate.getTime())) {
          filter.scheduledAt.$gte = fromDate;
        }
      }
      if (query.toScheduledAt) {
        const toDate = new Date(query.toScheduledAt);
        if (!isNaN(toDate.getTime())) {
          filter.scheduledAt.$lte = toDate;
        }
      }
      if (Object.keys(filter.scheduledAt).length === 0) {
        delete filter.scheduledAt;
      }
    }

    const sort = { createdAt: -1 };

    const [bookings, total] = await Promise.all([
      bookingRepository.findUserBookings({
        userId,
        filter,
        sort,
        skip,
        limit,
      }),
      bookingRepository.countUserBookings({ userId, filter }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      bookings: bookings.map((b) => this.formatBookingResponse(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve a single booking by ID (Strict ownership-scoped)
   * @param {string} bookingId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getBookingById(bookingId, userId) {
    this.assertValidObjectId(bookingId, 'booking');
    this.assertValidObjectId(userId, 'user');

    const booking = await bookingRepository.findByIdAndUser(bookingId, userId);
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    return this.formatBookingResponse(booking);
  }

  /**
   * Cancel an existing booking (Authenticated customer owner only)
   * @param {string} bookingId
   * @param {string} userId
   * @param {string} cancellationReason
   * @returns {Promise<object>}
   */
  async cancelBooking(bookingId, userId, cancellationReason) {
    this.assertValidObjectId(bookingId, 'booking');
    this.assertValidObjectId(userId, 'user');

    const booking = await bookingRepository.findByIdAndUser(bookingId, userId);
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    // 1. Check if booking is already cancelled
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      throw new AppError('This booking is already cancelled.', 400);
    }

    // 2. Validate cancellable lifecycle boundary
    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
      throw new AppError(
        `Cannot cancel booking in '${booking.status}' status. Only bookings in [${CANCELLABLE_STATUSES.join(
          ', '
        )}] status can be cancelled.`,
        400
      );
    }

    const cancelledBooking = await bookingRepository.cancelBooking(bookingId, userId, {
      cancellationReason: cancellationReason.trim(),
      cancelledAt: new Date(),
    });

    return this.formatBookingResponse(cancelledBooking);
  }
}

module.exports = {
  BookingService,
  AppError,
  bookingService: new BookingService(),
};
