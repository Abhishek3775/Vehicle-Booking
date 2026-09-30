const assert = require('assert');
const mongoose = require('mongoose');
const inspectionService = require('./inspection.service');
const inspectionRepository = require('./inspection.repository');
const Inspection = require('./inspection.model');
const Booking = require('../booking/booking.model');
const Dispatch = require('../dispatch/dispatch.model');
const Service = require('../service/service.model');
const {
  INSPECTION_STATUS,
  OVERALL_CONDITION,
  CHECKLIST_CONDITION,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  INSPECTION_CATEGORIES,
  PHOTO_CATEGORIES,
} = require('./inspection.constants');
const {
  validateBookingIdParam,
  validateInspectionIdParam,
  validateUpdateInspection,
} = require('./inspection.validation');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING INSPECTION MODULE COMPREHENSIVE TEST SUITE ---\n');

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

  function createMockRes() {
    let statusCode = null;
    let resData = null;
    return {
      status(code) {
        statusCode = code;
        return {
          json(data) {
            resData = data;
          },
        };
      },
      getStatusCode: () => statusCode,
      getData: () => resData,
    };
  }

  // 1. Model Registration & Schema Paths
  test('1. Inspection Model is registered and has all required schema paths', () => {
    assert(Inspection.modelName === 'Inspection');
    const paths = Inspection.schema.paths;
    assert(paths['inspectionReference'], 'inspectionReference missing');
    assert(paths['bookingId'], 'bookingId missing');
    assert(paths['mechanicId'], 'mechanicId missing');
    assert(paths['userId'], 'userId missing');
    assert(paths['vehicleId'], 'vehicleId missing');
    assert(paths['status'], 'status missing');
    assert(paths['startedAt'], 'startedAt missing');
    assert(paths['completedAt'], 'completedAt missing');
    assert(paths['overallCondition'], 'overallCondition missing');
    assert(paths['customerComplaint'], 'customerComplaint missing');
    assert(paths['findings'], 'findings missing');
    assert(paths['recommendedServices'], 'recommendedServices missing');
    assert(paths['recommendedParts'], 'recommendedParts missing');
    assert(paths['checklist'], 'checklist missing');
    assert(paths['photos'], 'photos missing');
    assert(paths['videos'], 'videos missing');
    assert(paths['mechanicNotes'], 'mechanicNotes missing');
    assert(paths['customerNotes'], 'customerNotes missing');
    assert(paths['customerAcknowledgement.acknowledged'], 'customerAcknowledgement.acknowledged missing');
  });

  // 2. Route Registration in app.js
  test('2. /api/inspections routes are registered in Express app', () => {
    const routeLayers = app._router.stack.filter((layer) => layer.regexp.test('/api/inspections'));
    assert(routeLayers.length > 0, 'Route layer for /api/inspections must exist');
  });

  // 3. Validation: validateBookingIdParam and validateInspectionIdParam
  test('3. validateBookingIdParam and validateInspectionIdParam reject invalid hex ObjectIds', () => {
    const mockRes = createMockRes();
    let nextCalled = false;

    // Invalid bookingId
    validateBookingIdParam({ params: { bookingId: 'bad-id' } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert.strictEqual(nextCalled, false);

    // Invalid inspectionId
    nextCalled = false;
    validateInspectionIdParam({ params: { inspectionId: 'bad-id' } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert.strictEqual(nextCalled, false);

    // Valid IDs
    const validId = new mongoose.Types.ObjectId().toString();
    validateBookingIdParam({ params: { bookingId: validId } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 4. Validation: validateUpdateInspection catches forbidden fields
  test('4. validateUpdateInspection strictly rejects forbidden fields (bookingId, userId, vehicleId, mechanicId, inspectionReference, status)', () => {
    const mockRes = createMockRes();

    validateUpdateInspection(
      {
        body: {
          bookingId: new mongoose.Types.ObjectId().toString(),
          userId: new mongoose.Types.ObjectId().toString(),
          mechanicId: new mongoose.Types.ObjectId().toString(),
          status: 'COMPLETED',
          inspectionReference: 'INSP-HACK-001',
        },
      },
      mockRes,
      () => {}
    );

    assert.strictEqual(mockRes.getStatusCode(), 400);
    const fields = mockRes.getData().error.fields;
    assert(fields.bookingId);
    assert(fields.userId);
    assert(fields.mechanicId);
    assert(fields.status);
    assert(fields.inspectionReference);
  });

  // 5. Validation: validateUpdateInspection validates checklist condition and finding severity
  test('5. validateUpdateInspection validates checklist conditions and finding severity enums', () => {
    const mockRes = createMockRes();

    // Invalid condition
    validateUpdateInspection(
      {
        body: {
          checklist: [
            { item: 'Brake Fluid', condition: 'INVALID_CONDITION' },
          ],
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(mockRes.getStatusCode(), 400);

    // Invalid severity
    validateUpdateInspection(
      {
        body: {
          findings: [
            { title: 'Worn Belt', severity: 'EXTREME' },
          ],
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(mockRes.getStatusCode(), 400);

    // Valid checklist & findings
    let nextCalled = false;
    const validReq = {
      body: {
        overallCondition: OVERALL_CONDITION.FAIR,
        checklist: [
          { category: INSPECTION_CATEGORIES.BRAKES, item: 'Brake Pads', condition: CHECKLIST_CONDITION.REQUIRES_ATTENTION },
        ],
        findings: [
          { title: 'Front Brake Pads Worn', severity: SEVERITY_LEVELS.HIGH, category: INSPECTION_CATEGORIES.BRAKES },
        ],
        recommendedParts: [
          { name: 'Front Brake Pads Set', quantity: 1, reason: 'Worn below safe limit' },
        ],
      },
    };
    validateUpdateInspection(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 6. Service: Unique Inspection Reference Generation
  await asyncTest('6. generateInspectionReference produces valid INSP-YYYYMMDD-XXXX format', async () => {
    const ref1 = await inspectionService.generateInspectionReference();
    const ref2 = await inspectionService.generateInspectionReference();
    assert(/^INSP-\d{8}-\d{4}$/.test(ref1), `Ref 1 format invalid: ${ref1}`);
    assert(/^INSP-\d{8}-\d{4}$/.test(ref2), `Ref 2 format invalid: ${ref2}`);
  });

  // 7. Service: Customer cannot start inspection
  await asyncTest('7. startInspection rejects customer callers with 403', async () => {
    const origFindById = Booking.findById;
    try {
      Booking.findById = () => ({
        exec: async () => ({
          _id: new mongoose.Types.ObjectId(),
          status: BOOKING_STATUS.ARRIVED,
          userId: new mongoose.Types.ObjectId(),
          vehicleId: new mongoose.Types.ObjectId(),
        }),
      });

      let caught = false;
      try {
        await inspectionService.startInspection(
          new mongoose.Types.ObjectId().toString(),
          { role: ROLES.CUSTOMER, userId: new mongoose.Types.ObjectId() }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 403);
        assert(err.message.includes('Only mechanics assigned'));
      }
      assert.strictEqual(caught, true);
    } finally {
      Booking.findById = origFindById;
    }
  });

  // 8. Service: Unassigned mechanic cannot start inspection
  await asyncTest('8. startInspection rejects unassigned mechanic callers with 403', async () => {
    const origBookingFind = Booking.findById;
    const origDispatchFind = Dispatch.findOne;
    try {
      const assignedMechanicId = new mongoose.Types.ObjectId();
      const unassignedMechanicId = new mongoose.Types.ObjectId();

      Booking.findById = () => ({
        exec: async () => ({
          _id: new mongoose.Types.ObjectId(),
          status: BOOKING_STATUS.ARRIVED,
          userId: new mongoose.Types.ObjectId(),
          vehicleId: new mongoose.Types.ObjectId(),
        }),
      });

      Dispatch.findOne = () => ({
        exec: async () => ({
          mechanicId: assignedMechanicId,
          status: 'ASSIGNED',
        }),
      });

      let caught = false;
      try {
        await inspectionService.startInspection(
          new mongoose.Types.ObjectId().toString(),
          { role: ROLES.MECHANIC, userId: unassignedMechanicId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 403);
        assert(err.message.includes('not assigned'));
      }
      assert.strictEqual(caught, true);
    } finally {
      Booking.findById = origBookingFind;
      Dispatch.findOne = origDispatchFind;
    }
  });

  // 9. Service: Duplicate active inspection is rejected with 409
  await asyncTest('9. startInspection rejects duplicate active inspection for the same booking with 409', async () => {
    const origBookingFind = Booking.findById;
    const origDispatchFind = Dispatch.findOne;
    const origActiveFind = inspectionRepository.findActiveByBookingId;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();

      Booking.findById = () => ({
        exec: async () => ({
          _id: bookingId,
          status: BOOKING_STATUS.ARRIVED,
          userId: new mongoose.Types.ObjectId(),
          vehicleId: new mongoose.Types.ObjectId(),
        }),
      });

      Dispatch.findOne = () => ({
        exec: async () => ({
          mechanicId: mechanicUserId,
          status: 'ACCEPTED',
        }),
      });

      inspectionRepository.findActiveByBookingId = async () => ({
        _id: new mongoose.Types.ObjectId(),
        status: INSPECTION_STATUS.IN_PROGRESS,
      });

      let caught = false;
      try {
        await inspectionService.startInspection(
          bookingId.toString(),
          { role: ROLES.MECHANIC, userId: mechanicUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 409);
        assert(err.message.includes('already in progress'));
      }
      assert.strictEqual(caught, true);
    } finally {
      Booking.findById = origBookingFind;
      Dispatch.findOne = origDispatchFind;
      inspectionRepository.findActiveByBookingId = origActiveFind;
    }
  });

  // 10. Service: Assigned mechanic successfully starts inspection and updates booking to INSPECTION
  await asyncTest('10. Assigned mechanic successfully starts inspection and transitions booking to INSPECTION', async () => {
    const origBookingFind = Booking.findById;
    const origBookingUpdate = Booking.findByIdAndUpdate;
    const origDispatchFind = Dispatch.findOne;
    const origActiveFind = inspectionRepository.findActiveByBookingId;
    const origCreate = inspectionRepository.create;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const customerUserId = new mongoose.Types.ObjectId();
      const vehicleId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      let bookingUpdatedStatus = null;

      Booking.findById = () => ({
        exec: async () => ({
          _id: bookingId,
          status: BOOKING_STATUS.ARRIVED,
          customerNotes: 'Squeaking sound when braking',
          userId: customerUserId,
          vehicleId: vehicleId,
        }),
      });

      Booking.findByIdAndUpdate = (id, update) => {
        bookingUpdatedStatus = update.$set.status;
        return { exec: async () => ({}) };
      };

      Dispatch.findOne = () => ({
        exec: async () => ({
          mechanicId: mechanicUserId,
          status: 'ACCEPTED',
        }),
      });

      inspectionRepository.findActiveByBookingId = async () => null;

      inspectionRepository.create = async (data) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const inspection = await inspectionService.startInspection(
        bookingId.toString(),
        { role: ROLES.MECHANIC, userId: mechanicUserId }
      );

      assert.strictEqual(inspection.status, INSPECTION_STATUS.IN_PROGRESS);
      assert.strictEqual(inspection.customerComplaint, 'Squeaking sound when braking');
      assert.strictEqual(inspection.mechanicId, mechanicUserId.toString());
      assert.strictEqual(bookingUpdatedStatus, BOOKING_STATUS.INSPECTION);
    } finally {
      Booking.findById = origBookingFind;
      Booking.findByIdAndUpdate = origBookingUpdate;
      Dispatch.findOne = origDispatchFind;
      inspectionRepository.findActiveByBookingId = origActiveFind;
      inspectionRepository.create = origCreate;
    }
  });

  // 11. Service: Mechanic cannot modify another mechanic's inspection
  await asyncTest('11. updateInspection rejects unauthorized mechanic with 403', async () => {
    const origFindById = inspectionRepository.findById;
    try {
      const assignedMechanicId = new mongoose.Types.ObjectId();
      const otherMechanicId = new mongoose.Types.ObjectId();

      inspectionRepository.findById = async () => ({
        _id: new mongoose.Types.ObjectId(),
        status: INSPECTION_STATUS.IN_PROGRESS,
        mechanicId: assignedMechanicId,
      });

      let caught = false;
      try {
        await inspectionService.updateInspection(
          new mongoose.Types.ObjectId().toString(),
          { overallCondition: OVERALL_CONDITION.FAIR },
          { role: ROLES.MECHANIC, userId: otherMechanicId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 403);
      }
      assert.strictEqual(caught, true);
    } finally {
      inspectionRepository.findById = origFindById;
    }
  });

  // 12. Service: Invalid recommended service ID rejected with 400
  await asyncTest('12. updateInspection rejects non-existent recommended service IDs with 400', async () => {
    const origFindById = inspectionRepository.findById;
    const origServiceCount = Service.countDocuments;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();
      const fakeServiceId = new mongoose.Types.ObjectId().toString();

      inspectionRepository.findById = async () => ({
        _id: inspectionId,
        status: INSPECTION_STATUS.IN_PROGRESS,
        mechanicId: mechanicUserId,
      });

      Service.countDocuments = () => ({
        exec: async () => 0, // Service does not exist
      });

      let caught = false;
      try {
        await inspectionService.updateInspection(
          inspectionId.toString(),
          {
            recommendedServices: [
              { serviceId: fakeServiceId, reason: 'Oil degraded' },
            ],
          },
          { role: ROLES.MECHANIC, userId: mechanicUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 400);
        assert(err.message.includes('do not exist in the service catalogue'));
      }
      assert.strictEqual(caught, true);
    } finally {
      inspectionRepository.findById = origFindById;
      Service.countDocuments = origServiceCount;
    }
  });

  // 13. Service: Recommended parts recorded as findings without requiring Parts inventory
  await asyncTest('13. updateInspection successfully stores recommended parts as findings', async () => {
    const origFindById = inspectionRepository.findById;
    const origUpdateById = inspectionRepository.updateById;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();

      inspectionRepository.findById = async () => ({
        _id: inspectionId,
        status: INSPECTION_STATUS.IN_PROGRESS,
        mechanicId: mechanicUserId,
      });

      inspectionRepository.updateById = async (id, updateData) => ({
        _id: inspectionId,
        status: INSPECTION_STATUS.IN_PROGRESS,
        mechanicId: mechanicUserId,
        recommendedParts: updateData.recommendedParts || [],
      });

      const updated = await inspectionService.updateInspection(
        inspectionId.toString(),
        {
          recommendedParts: [
            { name: 'Front Brake Disc Set', quantity: 2, reason: 'Rotor warped', priority: PRIORITY_LEVELS.HIGH },
          ],
        },
        { role: ROLES.MECHANIC, userId: mechanicUserId }
      );

      assert.strictEqual(updated.recommendedParts.length, 1);
      assert.strictEqual(updated.recommendedParts[0].name, 'Front Brake Disc Set');
      assert.strictEqual(updated.recommendedParts[0].quantity, 2);
    } finally {
      inspectionRepository.findById = origFindById;
      inspectionRepository.updateById = origUpdateById;
    }
  });

  // 14. Service: Inspection can be completed and transitions booking to QUOTE_PENDING
  await asyncTest('14. completeInspection transitions status to COMPLETED and booking to QUOTE_PENDING', async () => {
    const origFindById = inspectionRepository.findById;
    const origComplete = inspectionRepository.completeInspection;
    const origBookingUpdate = Booking.findByIdAndUpdate;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();
      let bookingUpdatedStatus = null;

      inspectionRepository.findById = async () => ({
        _id: inspectionId,
        bookingId: bookingId,
        status: INSPECTION_STATUS.IN_PROGRESS,
        mechanicId: mechanicUserId,
      });

      inspectionRepository.completeInspection = async (id, completedAt) => ({
        _id: inspectionId,
        bookingId: bookingId,
        status: INSPECTION_STATUS.COMPLETED,
        mechanicId: mechanicUserId,
        completedAt: completedAt,
      });

      Booking.findByIdAndUpdate = (id, update) => {
        bookingUpdatedStatus = update.$set.status;
        return { exec: async () => ({}) };
      };

      const completed = await inspectionService.completeInspection(
        inspectionId.toString(),
        { role: ROLES.MECHANIC, userId: mechanicUserId },
        { overallCondition: OVERALL_CONDITION.REQUIRES_REPAIR }
      );

      assert.strictEqual(completed.status, INSPECTION_STATUS.COMPLETED);
      assert(completed.completedAt !== null);
      assert.strictEqual(bookingUpdatedStatus, BOOKING_STATUS.QUOTE_PENDING);
    } finally {
      inspectionRepository.findById = origFindById;
      inspectionRepository.completeInspection = origComplete;
      Booking.findByIdAndUpdate = origBookingUpdate;
    }
  });

  // 15. Service: Completed inspection cannot be freely modified
  await asyncTest('15. updateInspection rejects updates to COMPLETED inspection with 400', async () => {
    const origFindById = inspectionRepository.findById;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();

      inspectionRepository.findById = async () => ({
        _id: inspectionId,
        status: INSPECTION_STATUS.COMPLETED,
        mechanicId: mechanicUserId,
      });

      let caught = false;
      try {
        await inspectionService.updateInspection(
          inspectionId.toString(),
          { overallCondition: OVERALL_CONDITION.GOOD },
          { role: ROLES.MECHANIC, userId: mechanicUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 400);
        assert(err.message.includes('Only IN_PROGRESS inspections can be edited'));
      }
      assert.strictEqual(caught, true);
    } finally {
      inspectionRepository.findById = origFindById;
    }
  });

  // 16. Service: Customer can view own completed inspection, but cannot view another user's
  await asyncTest('16. getInspectionById permits customer owner and blocks unauthorized customer', async () => {
    const origFindById = inspectionRepository.findById;
    try {
      const customerUserId = new mongoose.Types.ObjectId();
      const strangerUserId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();

      inspectionRepository.findById = async () => ({
        _id: inspectionId,
        userId: customerUserId,
        status: INSPECTION_STATUS.COMPLETED,
        inspectionReference: 'INSP-20260926-0001',
      });

      // Customer owner
      const ownResult = await inspectionService.getInspectionById(
        inspectionId.toString(),
        { role: ROLES.CUSTOMER, userId: customerUserId }
      );
      assert.strictEqual(ownResult.inspectionReference, 'INSP-20260926-0001');

      // Stranger customer
      let caught = false;
      try {
        await inspectionService.getInspectionById(
          inspectionId.toString(),
          { role: ROLES.CUSTOMER, userId: strangerUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 403);
      }
      assert.strictEqual(caught, true);
    } finally {
      inspectionRepository.findById = origFindById;
    }
  });

  // 17. Service: Customer can acknowledge completed inspection
  await asyncTest('17. acknowledgeInspection permits customer owner on COMPLETED inspection', async () => {
    const origFindById = inspectionRepository.findById;
    const origAcknowledge = inspectionRepository.acknowledgeInspection;
    try {
      const customerUserId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();

      inspectionRepository.findById = async () => ({
        _id: inspectionId,
        userId: customerUserId,
        status: INSPECTION_STATUS.COMPLETED,
      });

      inspectionRepository.acknowledgeInspection = async (id, { acknowledgedBy, acknowledgedAt }) => ({
        _id: inspectionId,
        userId: customerUserId,
        status: INSPECTION_STATUS.COMPLETED,
        customerAcknowledgement: {
          acknowledged: true,
          acknowledgedAt,
          acknowledgedBy,
        },
      });

      const acknowledged = await inspectionService.acknowledgeInspection(
        inspectionId.toString(),
        { role: ROLES.CUSTOMER, userId: customerUserId }
      );

      assert.strictEqual(acknowledged.customerAcknowledgement.acknowledged, true);
      assert.strictEqual(acknowledged.customerAcknowledgement.acknowledgedBy, customerUserId.toString());
    } finally {
      inspectionRepository.findById = origFindById;
      inspectionRepository.acknowledgeInspection = origAcknowledge;
    }
  });

  // 18. Service: Acknowledge on IN_PROGRESS inspection is rejected with 400
  await asyncTest('18. acknowledgeInspection rejects non-COMPLETED inspection with 400', async () => {
    const origFindById = inspectionRepository.findById;
    try {
      const customerUserId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();

      inspectionRepository.findById = async () => ({
        _id: inspectionId,
        userId: customerUserId,
        status: INSPECTION_STATUS.IN_PROGRESS,
      });

      let caught = false;
      try {
        await inspectionService.acknowledgeInspection(
          inspectionId.toString(),
          { role: ROLES.CUSTOMER, userId: customerUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 400);
        assert(err.message.includes('must be in COMPLETED status'));
      }
      assert.strictEqual(caught, true);
    } finally {
      inspectionRepository.findById = origFindById;
    }
  });

  // Summary
  console.log('\n=================================================');
  console.log(`INSPECTION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Unhandled inspection test error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
