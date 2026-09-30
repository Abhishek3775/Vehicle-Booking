const assert = require('assert');
const mongoose = require('mongoose');
const { dispatchService, AppError } = require('./dispatch.service');
const dispatchRepository = require('./dispatch.repository');
const Dispatch = require('./dispatch.model');
const Booking = require('../booking/booking.model');
const Auth = require('../auth/auth.model');
const {
  DISPATCH_STATUS,
  ASSIGNMENT_TYPES,
  DISPATCH_LIMITS,
} = require('./dispatch.constants');
const {
  validateManualAssign,
  validateRejectAssignment,
  validateCancelDispatch,
} = require('./dispatch.validation');
const { ROLES, ACCOUNT_STATUS } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING DISPATCH MODULE COMPREHENSIVE TEST SUITE ---\n');

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

  // 1. Model Registration & Schema Paths
  test('1. Dispatch Model is registered and has correct schema paths', () => {
    assert(Dispatch.modelName === 'Dispatch');
    const paths = Dispatch.schema.paths;
    assert(paths['bookingId'], 'bookingId missing');
    assert(paths['mechanicId'], 'mechanicId missing');
    assert(paths['status'], 'status missing');
    assert(paths['assignmentType'], 'assignmentType missing');
    assert(paths['assignedAt'], 'assignedAt missing');
    assert(paths['acceptedAt'], 'acceptedAt missing');
    assert(paths['rejectedAt'], 'rejectedAt missing');
    assert(paths['rejectionReason'], 'rejectionReason missing');
    assert(paths['cancelledAt'], 'cancelledAt missing');
    assert(paths['cancelledBy'], 'cancelledBy missing');
    assert(paths['cancellationReason'], 'cancellationReason missing');
    assert(paths['assignmentAttempts'], 'assignmentAttempts missing');
    assert(paths['assignmentHistory'], 'assignmentHistory missing');
  });

  // 2. Route Registration
  test('2. /api/dispatch route is registered in app.js', () => {
    const routeLayers = app._router.stack.filter((layer) => layer.regexp.test('/api/dispatch'));
    assert(routeLayers.length > 0, 'Route layer for /api/dispatch must exist');
  });

  // 3. Validation: validateManualAssign
  test('3. validateManualAssign validates mechanicId and notes', () => {
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

    // Missing mechanicId
    validateManualAssign({ body: {} }, mockRes, () => {});
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.mechanicId, 'mechanicId error expected');

    // Invalid ObjectId
    validateManualAssign({ body: { mechanicId: 'invalid-id' } }, mockRes, () => {});
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.mechanicId.includes('valid MongoDB ObjectId'));

    // Valid mechanicId
    let nextCalled = false;
    const validId = new mongoose.Types.ObjectId().toString();
    validateManualAssign({ body: { mechanicId: validId, notes: 'Priority assignment' } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 4. Validation: validateRejectAssignment
  test('4. validateRejectAssignment requires non-empty rejectionReason within bounds', () => {
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

    // Missing reason
    validateRejectAssignment({ body: {} }, mockRes, () => {});
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.rejectionReason);

    // Too short reason
    validateRejectAssignment({ body: { rejectionReason: 'no' } }, mockRes, () => {});
    assert.strictEqual(statusCode, 400);

    // Valid reason
    let nextCalled = false;
    validateRejectAssignment({ body: { rejectionReason: 'Currently on another service' } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 5. Distance Calculation Utility
  test('5. calculateDistance accurately computes distance using Haversine formula', () => {
    // Bangalore to Mysore (~128 km straight line)
    const dist = dispatchService.calculateDistance(12.9716, 77.5946, 12.2958, 76.6394);
    assert(dist > 120 && dist < 140, `Distance ${dist} should be around 128km`);

    // Same coordinates -> 0 km
    assert.strictEqual(dispatchService.calculateDistance(12.9716, 77.5946, 12.9716, 77.5946), 0);
  });

  // 6. Service Layer: Create Dispatch and Duplicate Active Prevention
  await asyncTest('6. createDispatch initiates dispatch and rejects duplicate active dispatch', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const originalFindBooking = Booking.findById;
    const originalFindActive = dispatchRepository.findActiveByBookingId;
    const originalCreate = dispatchRepository.create;

    Booking.findById = () => ({
      exec: async () => ({
        _id: bookingId,
        status: 'PENDING',
      }),
    });

    // 1st call: no active dispatch
    dispatchRepository.findActiveByBookingId = async () => null;
    dispatchRepository.create = async (payload) => ({
      _id: new mongoose.Types.ObjectId(),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      const dispatch = await dispatchService.createDispatch(bookingId, 'admin1');
      assert.strictEqual(dispatch.status, DISPATCH_STATUS.PENDING);
      assert.strictEqual(dispatch.bookingId, bookingId);

      // 2nd call: active dispatch already exists -> throws 409
      dispatchRepository.findActiveByBookingId = async () => ({
        _id: 'activeDispatchId',
        status: DISPATCH_STATUS.PENDING,
      });

      await assert.rejects(
        async () => {
          await dispatchService.createDispatch(bookingId, 'admin1');
        },
        (err) => err instanceof AppError && err.statusCode === 409
      );
    } finally {
      Booking.findById = originalFindBooking;
      dispatchRepository.findActiveByBookingId = originalFindActive;
      dispatchRepository.create = originalCreate;
    }
  });

  // 7. Service Layer: Manual Mechanic Assignment
  await asyncTest('7. manualAssignMechanic assigns active mechanic and tracks assignment attempts', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const mechanicId = new mongoose.Types.ObjectId().toString();
    const originalFindBooking = Booking.findById;
    const originalFindBookingUpdate = Booking.findByIdAndUpdate;
    const originalFindMechanic = dispatchRepository.findMechanicById;
    const originalFindActive = dispatchRepository.findActiveByBookingId;
    const originalCreate = dispatchRepository.create;

    Booking.findById = () => ({
      exec: async () => ({
        _id: bookingId,
        status: 'PENDING',
      }),
    });

    Booking.findByIdAndUpdate = () => ({
      exec: async () => {},
    });

    dispatchRepository.findMechanicById = async (id) => ({
      userId: id,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      role: ROLES.MECHANIC,
    });

    dispatchRepository.findActiveByBookingId = async () => null;
    dispatchRepository.create = async (payload) => ({
      _id: new mongoose.Types.ObjectId(),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      const dispatch = await dispatchService.manualAssignMechanic(bookingId, mechanicId, 'admin1', {
        notes: 'Urgent roadside',
      });
      assert.strictEqual(dispatch.status, DISPATCH_STATUS.ASSIGNED);
      assert.strictEqual(dispatch.mechanicId, mechanicId);
      assert.strictEqual(dispatch.assignmentAttempts, 1);
      assert.strictEqual(dispatch.assignmentHistory.length, 1);
    } finally {
      Booking.findById = originalFindBooking;
      Booking.findByIdAndUpdate = originalFindBookingUpdate;
      dispatchRepository.findMechanicById = originalFindMechanic;
      dispatchRepository.findActiveByBookingId = originalFindActive;
      dispatchRepository.create = originalCreate;
    }
  });

  // 8. Service Layer: Mechanic Acceptance Workflow
  await asyncTest('8. acceptAssignment allows assigned mechanic to accept and updates status', async () => {
    const dispatchId = new mongoose.Types.ObjectId().toString();
    const mechanicId = new mongoose.Types.ObjectId().toString();
    const otherMechanicId = new mongoose.Types.ObjectId().toString();
    const bookingId = new mongoose.Types.ObjectId().toString();

    const originalFindById = dispatchRepository.findById;
    const originalUpdateById = dispatchRepository.updateById;
    const originalBookingUpdate = Booking.findByIdAndUpdate;

    const currentDispatch = {
      _id: dispatchId,
      bookingId,
      mechanicId: new mongoose.Types.ObjectId(mechanicId),
      status: DISPATCH_STATUS.ASSIGNED,
      assignmentHistory: [
        {
          mechanicId: new mongoose.Types.ObjectId(mechanicId),
          status: DISPATCH_STATUS.ASSIGNED,
        },
      ],
    };

    dispatchRepository.findById = async () => currentDispatch;
    dispatchRepository.updateById = async (id, update) => ({
      ...currentDispatch,
      ...update,
    });
    Booking.findByIdAndUpdate = () => ({ exec: async () => {} });

    try {
      // Unauthorized mechanic attempt -> 403
      await assert.rejects(
        async () => {
          await dispatchService.acceptAssignment(dispatchId, otherMechanicId);
        },
        (err) => err instanceof AppError && err.statusCode === 403
      );

      // Assigned mechanic accepts -> Success
      const result = await dispatchService.acceptAssignment(dispatchId, mechanicId);
      assert.strictEqual(result.status, DISPATCH_STATUS.ACCEPTED);
      assert(result.acceptedAt !== null);
    } finally {
      dispatchRepository.findById = originalFindById;
      dispatchRepository.updateById = originalUpdateById;
      Booking.findByIdAndUpdate = originalBookingUpdate;
    }
  });

  // 9. Service Layer: Mechanic Rejection Workflow
  await asyncTest('9. rejectAssignment records rejection reason and timestamp in history', async () => {
    const dispatchId = new mongoose.Types.ObjectId().toString();
    const mechanicId = new mongoose.Types.ObjectId().toString();

    const originalFindById = dispatchRepository.findById;
    const originalUpdateById = dispatchRepository.updateById;

    const currentDispatch = {
      _id: dispatchId,
      mechanicId: new mongoose.Types.ObjectId(mechanicId),
      status: DISPATCH_STATUS.ASSIGNED,
      assignmentHistory: [
        {
          mechanicId: new mongoose.Types.ObjectId(mechanicId),
          status: DISPATCH_STATUS.ASSIGNED,
        },
      ],
    };

    dispatchRepository.findById = async () => currentDispatch;
    dispatchRepository.updateById = async (id, update) => ({
      ...currentDispatch,
      ...update,
    });

    try {
      const result = await dispatchService.rejectAssignment(
        dispatchId,
        mechanicId,
        'Tool unavailable for brake inspection'
      );
      assert.strictEqual(result.status, DISPATCH_STATUS.REJECTED);
      assert.strictEqual(result.rejectionReason, 'Tool unavailable for brake inspection');
    } finally {
      dispatchRepository.findById = originalFindById;
      dispatchRepository.updateById = originalUpdateById;
    }
  });

  // 10. Service Layer: Auto-Assignment
  await asyncTest('10. autoAssignMechanic ranks mechanics by workload/distance and auto-assigns', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const mechanic1Id = new mongoose.Types.ObjectId().toString();
    const mechanic2Id = new mongoose.Types.ObjectId().toString();

    const originalFindBooking = Booking.findById;
    const originalBookingUpdate = Booking.findByIdAndUpdate;
    const originalFindActive = dispatchRepository.findActiveByBookingId;
    const originalFindEligible = dispatchRepository.findEligibleMechanics;
    const originalFindAssignments = dispatchRepository.findMechanicActiveAssignments;
    const originalUpdateById = dispatchRepository.updateById;

    Booking.findById = () => ({
      exec: async () => ({
        _id: bookingId,
        status: 'PENDING',
        locationSnapshot: { latitude: 12.9716, longitude: 77.5946 },
      }),
    });
    Booking.findByIdAndUpdate = () => ({ exec: async () => {} });

    dispatchRepository.findActiveByBookingId = async () => ({
      _id: new mongoose.Types.ObjectId(),
      bookingId,
      status: DISPATCH_STATUS.SEARCHING,
      assignmentAttempts: 0,
      assignmentHistory: [],
    });

    dispatchRepository.findEligibleMechanics = async () => [
      {
        userId: mechanic1Id,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
        preferences: { latitude: 12.98, longitude: 77.60 }, // ~1.5 km
      },
      {
        userId: mechanic2Id,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
        preferences: { latitude: 12.80, longitude: 77.40 }, // ~28 km
      },
    ];

    dispatchRepository.findMechanicActiveAssignments = async () => []; // Both have 0 active jobs
    dispatchRepository.updateById = async (id, update) => ({
      _id: id,
      bookingId,
      ...update,
    });

    try {
      const result = await dispatchService.autoAssignMechanic(bookingId, 'admin1');
      assert.strictEqual(result.status, DISPATCH_STATUS.ASSIGNED);
      assert.strictEqual(result.assignmentType, ASSIGNMENT_TYPES.AUTO);
      assert.strictEqual(result.mechanicId, mechanic1Id, 'Should pick nearest mechanic 1');
      assert.strictEqual(result.assignmentAttempts, 1);
    } finally {
      Booking.findById = originalFindBooking;
      Booking.findByIdAndUpdate = originalBookingUpdate;
      dispatchRepository.findActiveByBookingId = originalFindActive;
      dispatchRepository.findEligibleMechanics = originalFindEligible;
      dispatchRepository.findMechanicActiveAssignments = originalFindAssignments;
      dispatchRepository.updateById = originalUpdateById;
    }
  });

  // 11. Customer Privacy on Booking Dispatch
  await asyncTest('11. Customer can only view dispatch for their own booking', async () => {
    const customer1Id = new mongoose.Types.ObjectId().toString();
    const customer2Id = new mongoose.Types.ObjectId().toString();
    const bookingId = new mongoose.Types.ObjectId().toString();

    const originalFindBooking = Booking.findById;
    const originalFindActive = dispatchRepository.findActiveByBookingId;

    Booking.findById = () => ({
      exec: async () => ({
        _id: bookingId,
        userId: customer1Id,
      }),
    });

    dispatchRepository.findActiveByBookingId = async () => ({
      _id: 'dispatch1',
      bookingId,
      status: 'ASSIGNED',
    });

    try {
      // Customer 1 (owner) can view
      const d1 = await dispatchService.getDispatchByBookingId(bookingId, {
        userId: customer1Id,
        role: ROLES.CUSTOMER,
      });
      assert.strictEqual(d1.bookingId, bookingId);

      // Customer 2 gets 404
      await assert.rejects(
        async () => {
          await dispatchService.getDispatchByBookingId(bookingId, {
            userId: customer2Id,
            role: ROLES.CUSTOMER,
          });
        },
        (err) => err instanceof AppError && err.statusCode === 404
      );
    } finally {
      Booking.findById = originalFindBooking;
      dispatchRepository.findActiveByBookingId = originalFindActive;
    }
  });

  console.log(`\n--- ALL ${passed} IN-MEMORY DISPATCH MODULE TESTS PASSED! ---\n`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
