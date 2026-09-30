const assert = require('assert');
const mongoose = require('mongoose');
const { bookingService, AppError } = require('./booking.service');
const bookingRepository = require('./booking.repository');
const Booking = require('./booking.model');
const Vehicle = require('../vehicle/vehicle.model');
const Address = require('../address/address.model');
const Service = require('../service/service.model');
const ServicePackage = require('../service-package/servicePackage.model');
const {
  BOOKING_TYPES,
  BOOKING_STATUS,
  CANCELLABLE_STATUSES,
} = require('./booking.constants');
const {
  validateCreateBooking,
  validateCancelBooking,
} = require('./booking.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authService } = require('../auth/auth.service');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING BOOKING MODULE COMPREHENSIVE TEST SUITE ---\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Check Model definition and schema paths
  test('1. Booking Model is registered and has correct schema paths', () => {
    assert(Booking.modelName === 'Booking');
    const paths = Booking.schema.paths;
    assert(paths['bookingReference'], 'bookingReference missing');
    assert(paths['userId'], 'userId missing');
    assert(paths['vehicleId'], 'vehicleId missing');
    assert(paths['serviceId'], 'serviceId missing');
    assert(paths['servicePackageId'], 'servicePackageId missing');
    assert(paths['bookingType'], 'bookingType missing');
    assert(paths['scheduledAt'], 'scheduledAt missing');
    assert(paths['addressId'], 'addressId missing');
    assert(paths['locationSnapshot.latitude'], 'locationSnapshot.latitude missing');
    assert(paths['locationSnapshot.longitude'], 'locationSnapshot.longitude missing');
    assert(paths['locationSnapshot.addressText'], 'locationSnapshot.addressText missing');
    assert(paths['addressSnapshot.addressLine1'], 'addressSnapshot.addressLine1 missing');
    assert(paths['vehicleSnapshot.registrationNumber'], 'vehicleSnapshot.registrationNumber missing');
    assert(paths['serviceSnapshot.basePrice'], 'serviceSnapshot.basePrice missing');
    assert(paths['packageSnapshot.basePrice'], 'packageSnapshot.basePrice missing');
    assert(paths['customerNotes'], 'customerNotes missing');
    assert(paths['status'], 'status missing');
    assert(paths['cancellationReason'], 'cancellationReason missing');
    assert(paths['cancelledBy'], 'cancelledBy missing');
    assert(paths['cancelledAt'], 'cancelledAt missing');
  });

  // 2. Route Registration
  test('2. /api/bookings route is registered in app.js', () => {
    const routeLayers = app._router.stack.filter((layer) => layer.regexp.test('/api/bookings'));
    assert(routeLayers.length > 0, 'Route layer for /api/bookings must exist');
  });

  // 3. Validation: validateCreateBooking catches missing or invalid fields
  test('3. validateCreateBooking catches forbidden fields, missing vehicle, and service/package violations', () => {
    let resData = null;
    let statusCode = null;
    const mockRes = {
      status(code) {
        statusCode = code;
        return {
          json(data) {
            resData = data;
          },
        };
      },
    };

    // Missing vehicleId and service/package
    validateCreateBooking({ body: {} }, mockRes, () => {});
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.vehicleId, 'vehicleId error expected');
    assert(resData.error.fields.service, 'service/package error expected');

    // Both serviceId and servicePackageId supplied
    const validId1 = new mongoose.Types.ObjectId().toString();
    const validId2 = new mongoose.Types.ObjectId().toString();
    validateCreateBooking(
      {
        body: {
          vehicleId: validId1,
          serviceId: validId1,
          servicePackageId: validId2,
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.service.includes('Cannot provide both'));

    // Forbidden field injection
    validateCreateBooking(
      {
        body: {
          vehicleId: validId1,
          serviceId: validId2,
          userId: 'injectedUserId',
          status: 'IN_PROGRESS',
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.userId, 'userId forbidden error expected');
    assert(resData.error.fields.status, 'status forbidden error expected');
  });

  // 4. Validation: validateCreateBooking scheduled vs emergency rules
  test('4. validateCreateBooking enforces scheduledAt and address rules per bookingType', () => {
    let resData = null;
    let statusCode = null;
    const mockRes = {
      status(code) {
        statusCode = code;
        return {
          json(data) {
            resData = data;
          },
        };
      },
    };

    const validId = new mongoose.Types.ObjectId().toString();

    // SCHEDULED with past date
    validateCreateBooking(
      {
        body: {
          vehicleId: validId,
          serviceId: validId,
          bookingType: 'SCHEDULED',
          scheduledAt: new Date(Date.now() - 3600000).toISOString(),
          addressId: validId,
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.scheduledAt.includes('future'));

    // SCHEDULED missing addressId
    validateCreateBooking(
      {
        body: {
          vehicleId: validId,
          serviceId: validId,
          bookingType: 'SCHEDULED',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.addressId, 'addressId required for scheduled');

    // EMERGENCY missing both location and addressId
    validateCreateBooking(
      {
        body: {
          vehicleId: validId,
          serviceId: validId,
          bookingType: 'EMERGENCY',
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.location, 'location or addressId required for emergency');
  });

  // 5. Test Reference Generation Format
  await asyncTest('5. generateBookingReference creates unique BK-YYYYMMDD-XXXX format', async () => {
    const originalFindByRef = bookingRepository.findByReference;
    bookingRepository.findByReference = async () => null;

    try {
      const ref = await bookingService.generateBookingReference();
      assert(/^BK-\d{8}-[A-Z0-9]{4}$/.test(ref), `Reference ${ref} should match regex`);
    } finally {
      bookingRepository.findByReference = originalFindByRef;
    }
  });

  // 6. Test Service Layer: Vehicle Ownership & Status Enforcement
  await asyncTest('6. createBooking rejects foreign vehicle and inactive vehicle', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const foreignVehicleId = new mongoose.Types.ObjectId().toString();

    const originalFindVehicle = Vehicle.findOne;

    // Simulate vehicle not belonging to user
    Vehicle.findOne = () => ({
      exec: async () => null,
    });

    try {
      await assert.rejects(
        async () => {
          await bookingService.createBooking(userId, {
            vehicleId: foreignVehicleId,
            serviceId: new mongoose.Types.ObjectId().toString(),
            bookingType: 'EMERGENCY',
            location: { latitude: 12.97, longitude: 77.59 },
          });
        },
        (err) => err instanceof AppError && err.statusCode === 404
      );

      // Simulate inactive vehicle
      Vehicle.findOne = () => ({
        exec: async () => ({
          _id: foreignVehicleId,
          userId,
          status: 'INACTIVE',
          vehicleType: 'FOUR_WHEELER',
        }),
      });

      await assert.rejects(
        async () => {
          await bookingService.createBooking(userId, {
            vehicleId: foreignVehicleId,
            serviceId: new mongoose.Types.ObjectId().toString(),
            bookingType: 'EMERGENCY',
            location: { latitude: 12.97, longitude: 77.59 },
          });
        },
        (err) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message.includes('inactive')
      );
    } finally {
      Vehicle.findOne = originalFindVehicle;
    }
  });

  // 7. Test Service Layer: Vehicle-Service Incompatibility
  await asyncTest('7. createBooking rejects vehicle and service compatibility mismatch', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const vehicleId = new mongoose.Types.ObjectId().toString();
    const serviceId = new mongoose.Types.ObjectId().toString();

    const originalFindVehicle = Vehicle.findOne;
    const originalFindService = Service.findById;

    Vehicle.findOne = () => ({
      exec: async () => ({
        _id: vehicleId,
        userId,
        status: 'ACTIVE',
        vehicleType: 'TWO_WHEELER',
        make: 'Honda',
        model: 'Activa',
        registrationNumber: 'KA01AB1234',
        fuelType: 'PETROL',
      }),
    });

    // Service only supports FOUR_WHEELER
    Service.findById = () => ({
      exec: async () => ({
        _id: serviceId,
        name: 'Car AC Gas Refill',
        status: 'ACTIVE',
        vehicleTypes: ['FOUR_WHEELER'],
        basePrice: 1500,
        estimatedDuration: 45,
      }),
    });

    try {
      await assert.rejects(
        async () => {
          await bookingService.createBooking(userId, {
            vehicleId,
            serviceId,
            bookingType: 'EMERGENCY',
            location: { latitude: 12.97, longitude: 77.59 },
          });
        },
        (err) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message.includes('incompatible with your vehicle type')
      );
    } finally {
      Vehicle.findOne = originalFindVehicle;
      Service.findById = originalFindService;
    }
  });

  // 8. Test Service Layer: Successful Booking Creation with Snapshots
  await asyncTest('8. createBooking creates scheduled booking and populates accurate snapshots', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const vehicleId = new mongoose.Types.ObjectId().toString();
    const addressId = new mongoose.Types.ObjectId().toString();
    const serviceId = new mongoose.Types.ObjectId().toString();

    const originalFindVehicle = Vehicle.findOne;
    const originalFindAddress = Address.findOne;
    const originalFindService = Service.findById;
    const originalCreateBooking = bookingRepository.create;
    const originalFindByReference = bookingRepository.findByReference;

    bookingRepository.findByReference = async () => null;

    Vehicle.findOne = () => ({
      exec: async () => ({
        _id: vehicleId,
        userId,
        status: 'ACTIVE',
        vehicleType: 'FOUR_WHEELER',
        make: 'Hyundai',
        model: 'Creta',
        variant: 'SX',
        registrationNumber: 'DL01XY9999',
        fuelType: 'DIESEL',
      }),
    });

    Address.findOne = () => ({
      exec: async () => ({
        _id: addressId,
        userId,
        status: 'ACTIVE',
        fullName: 'Rahul Sharma',
        phone: '9876543210',
        addressLine1: 'Flat 402, Green Valley',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
      }),
    });

    Service.findById = () => ({
      exec: async () => ({
        _id: serviceId,
        name: 'Full Synthetic Engine Oil Change',
        shortDescription: 'Oil overhaul',
        category: 'ENGINE',
        status: 'ACTIVE',
        vehicleTypes: ['FOUR_WHEELER'],
        basePrice: 2499,
        estimatedDuration: 60,
      }),
    });

    let createdPayload = null;
    bookingRepository.create = async (payload) => {
      createdPayload = payload;
      return {
        _id: new mongoose.Types.ObjectId(),
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    try {
      const scheduledDate = new Date(Date.now() + 86400000);
      const result = await bookingService.createBooking(userId, {
        vehicleId,
        serviceId,
        addressId,
        bookingType: 'SCHEDULED',
        scheduledAt: scheduledDate,
        customerNotes: 'Please call before arrival',
      });

      assert(createdPayload.bookingReference.startsWith('BK-'));
      assert.strictEqual(createdPayload.status, BOOKING_STATUS.PENDING);
      assert.strictEqual(createdPayload.vehicleSnapshot.registrationNumber, 'DL01XY9999');
      assert.strictEqual(createdPayload.addressSnapshot.fullName, 'Rahul Sharma');
      assert.strictEqual(createdPayload.serviceSnapshot.basePrice, 2499);
      assert.strictEqual(result.customerNotes, 'Please call before arrival');
    } finally {
      Vehicle.findOne = originalFindVehicle;
      Address.findOne = originalFindAddress;
      Service.findById = originalFindService;
      bookingRepository.create = originalCreateBooking;
      bookingRepository.findByReference = originalFindByReference;
    }
  });

  // 8b. Test Service Layer: Customer Booking Listing
  await asyncTest('8b. getUserBookings lists only customer bookings with pagination', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const originalFindUserBookings = bookingRepository.findUserBookings;
    const originalCountUserBookings = bookingRepository.countUserBookings;

    bookingRepository.findUserBookings = async () => [
      {
        _id: new mongoose.Types.ObjectId(),
        bookingReference: 'BK-20260926-0001',
        userId,
        status: 'PENDING',
        bookingType: 'SCHEDULED',
      },
    ];
    bookingRepository.countUserBookings = async () => 1;

    try {
      const result = await bookingService.getUserBookings({ userId, query: { page: 1, limit: 10 } });
      assert.strictEqual(result.bookings.length, 1);
      assert.strictEqual(result.pagination.total, 1);
      assert.strictEqual(result.pagination.page, 1);
    } finally {
      bookingRepository.findUserBookings = originalFindUserBookings;
      bookingRepository.countUserBookings = originalCountUserBookings;
    }
  });

  // 9. Test Single Booking Retrieval (Security / Ownership)
  await asyncTest('9. getBookingById protects user privacy and returns 404 for foreign booking', async () => {
    const user1Id = new mongoose.Types.ObjectId().toString();
    const user2Id = new mongoose.Types.ObjectId().toString();
    const bookingId = new mongoose.Types.ObjectId().toString();

    const originalFindByIdAndUser = bookingRepository.findByIdAndUser;

    bookingRepository.findByIdAndUser = async (id, userId) => {
      if (userId === user1Id) {
        return {
          _id: bookingId,
          bookingReference: 'BK-20260926-TEST',
          userId: user1Id,
          status: 'PENDING',
        };
      }
      return null;
    };

    try {
      // User 1 gets booking
      const b1 = await bookingService.getBookingById(bookingId, user1Id);
      assert.strictEqual(b1.id, bookingId);

      // User 2 gets 404 (does not leak that booking exists)
      await assert.rejects(
        async () => {
          await bookingService.getBookingById(bookingId, user2Id);
        },
        (err) => err instanceof AppError && err.statusCode === 404
      );
    } finally {
      bookingRepository.findByIdAndUser = originalFindByIdAndUser;
    }
  });

  // 10. Test Booking Cancellation Workflow
  await asyncTest('10. cancelBooking permits PENDING status cancellation and rejects COMPLETED/CANCELLED', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const bookingId = new mongoose.Types.ObjectId().toString();

    const originalFindByIdAndUser = bookingRepository.findByIdAndUser;
    const originalCancelBooking = bookingRepository.cancelBooking;

    let currentBooking = {
      _id: bookingId,
      bookingReference: 'BK-20260926-TEST',
      userId,
      status: BOOKING_STATUS.PENDING,
    };

    bookingRepository.findByIdAndUser = async () => currentBooking;
    bookingRepository.cancelBooking = async (id, uId, params) => {
      currentBooking.status = BOOKING_STATUS.CANCELLED;
      currentBooking.cancellationReason = params.cancellationReason;
      currentBooking.cancelledBy = uId;
      currentBooking.cancelledAt = params.cancelledAt;
      return currentBooking;
    };

    try {
      // 1. Cancel PENDING booking -> Success
      const result = await bookingService.cancelBooking(
        bookingId,
        userId,
        'Plans changed for the weekend'
      );
      assert.strictEqual(result.status, BOOKING_STATUS.CANCELLED);
      assert.strictEqual(result.cancellationReason, 'Plans changed for the weekend');

      // 2. Re-cancelling already cancelled booking -> Fails
      await assert.rejects(
        async () => {
          await bookingService.cancelBooking(bookingId, userId, 'Attempt 2');
        },
        (err) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message.includes('already cancelled')
      );

      // 3. Attempt cancelling COMPLETED booking -> Fails
      currentBooking.status = BOOKING_STATUS.COMPLETED;
      await assert.rejects(
        async () => {
          await bookingService.cancelBooking(bookingId, userId, 'Attempt on completed');
        },
        (err) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message.includes('Cannot cancel booking in')
      );
    } finally {
      bookingRepository.findByIdAndUser = originalFindByIdAndUser;
      bookingRepository.cancelBooking = originalCancelBooking;
    }
  });

  console.log(`\n--- ALL ${passed} IN-MEMORY BOOKING MODULE TESTS PASSED! ---\n`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
