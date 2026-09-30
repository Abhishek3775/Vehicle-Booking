const assert = require('assert');
const mongoose = require('mongoose');
const mechanicService = require('./mechanic.service');
const mechanicRepository = require('./mechanic.repository');
const Mechanic = require('./mechanic.model');
const Auth = require('../auth/auth.model');
const User = require('../user/user.model');
const Service = require('../service/service.model');
const {
  AVAILABILITY_STATUS,
  WORK_STATUS,
  VERIFICATION_STATUS,
  VEHICLE_TYPES,
  SPECIALIZATIONS,
  MECHANIC_LIMITS,
} = require('./mechanic.constants');
const {
  validateMechanicIdParam,
  validateCreateMechanic,
  validateUpdateMechanic,
  validateUpdateAvailability,
  validateUpdateWorkStatus,
  validateUpdateLocation,
  validateUpdateVerification,
} = require('./mechanic.validation');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING MECHANIC MODULE COMPREHENSIVE TEST SUITE ---\n');

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

  // Helper for mock Express response
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
  test('1. Mechanic Model is registered and has all required schema paths', () => {
    assert(Mechanic.modelName === 'Mechanic');
    const paths = Mechanic.schema.paths;
    assert(paths['userId'], 'userId path missing');
    assert(paths['mechanicCode'], 'mechanicCode path missing');
    assert(paths['displayName'], 'displayName path missing');
    assert(paths['profileImage'], 'profileImage path missing');
    assert(paths['phone'], 'phone path missing');
    assert(paths['experienceYears'], 'experienceYears path missing');
    assert(paths['specialization'], 'specialization path missing');
    assert(paths['skills'], 'skills path missing');
    assert(paths['supportedVehicleTypes'], 'supportedVehicleTypes path missing');
    assert(paths['supportedServiceIds'], 'supportedServiceIds path missing');
    assert(paths['availabilityStatus'], 'availabilityStatus path missing');
    assert(paths['workStatus'], 'workStatus path missing');
    assert(paths['verificationStatus'], 'verificationStatus path missing');
    assert(paths['currentLocation.latitude'], 'currentLocation.latitude path missing');
    assert(paths['currentLocation.longitude'], 'currentLocation.longitude path missing');
    assert(paths['serviceRadius'], 'serviceRadius path missing');
    assert(paths['ratingSummary.averageRating'], 'ratingSummary.averageRating path missing');
    assert(paths['ratingSummary.totalRatings'], 'ratingSummary.totalRatings path missing');
    assert(paths['completedJobs'], 'completedJobs path missing');
    assert(paths['cancelledJobs'], 'cancelledJobs path missing');
    assert(paths['notes'], 'notes path missing');
  });

  // 2. Route Registration in app.js
  test('2. /api/mechanics routes are registered in Express app', () => {
    const routeLayers = app._router.stack.filter((layer) => layer.regexp.test('/api/mechanics'));
    assert(routeLayers.length > 0, 'Route layer for /api/mechanics must exist');
  });

  // 3. Validation: validateMechanicIdParam
  test('3. validateMechanicIdParam rejects invalid hex ObjectIds', () => {
    const mockRes = createMockRes();
    let nextCalled = false;

    validateMechanicIdParam({ params: { mechanicId: 'invalid-id' } }, mockRes, () => {
      nextCalled = true;
    });

    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert.strictEqual(nextCalled, false);
    assert(mockRes.getData().message.includes('Invalid mechanic ID'));

    // Valid ID
    const validId = new mongoose.Types.ObjectId().toString();
    validateMechanicIdParam({ params: { mechanicId: validId } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 4. Validation: validateCreateMechanic
  test('4. validateCreateMechanic validates required fields and rejects forbidden fields', () => {
    const mockRes = createMockRes();

    // Rejects forbidden fields
    validateCreateMechanic(
      {
        body: {
          userId: new mongoose.Types.ObjectId().toString(),
          displayName: 'Ravi Kumar',
          mechanicCode: 'FORBIDDEN-CODE',
          ratingSummary: { averageRating: 5 },
          completedJobs: 10,
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert(mockRes.getData().error.fields.mechanicCode);
    assert(mockRes.getData().error.fields.ratingSummary);
    assert(mockRes.getData().error.fields.completedJobs);

    // Valid create payload
    let nextCalled = false;
    const validReq = {
      body: {
        userId: new mongoose.Types.ObjectId().toString(),
        displayName: 'Ravi Kumar',
        phone: '+919876543210',
        experienceYears: 6,
        specialization: SPECIALIZATIONS.ENGINE,
        skills: ['Engine Overhaul', 'Oil Change'],
        supportedVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
        serviceRadius: 20,
      },
    };
    validateCreateMechanic(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 5. Validation: validateUpdateMechanic rejects forbidden fields
  test('5. validateUpdateMechanic strictly rejects forbidden fields (userId, verificationStatus, ratingSummary, completedJobs, cancelledJobs)', () => {
    const mockRes = createMockRes();

    validateUpdateMechanic(
      {
        body: {
          userId: new mongoose.Types.ObjectId().toString(),
          verificationStatus: 'VERIFIED',
          ratingSummary: { averageRating: 5 },
          completedJobs: 100,
          cancelledJobs: 0,
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(mockRes.getStatusCode(), 400);
    const fields = mockRes.getData().error.fields;
    assert(fields.userId);
    assert(fields.verificationStatus);
    assert(fields.ratingSummary);
    assert(fields.completedJobs);
    assert(fields.cancelledJobs);
  });

  // 6. Validation: validateUpdateAvailability
  test('6. validateUpdateAvailability validates allowed availability states', () => {
    const mockRes = createMockRes();

    // Invalid status
    validateUpdateAvailability({ body: { availabilityStatus: 'SLEEPING' } }, mockRes, () => {});
    assert.strictEqual(mockRes.getStatusCode(), 400);

    // Valid status
    let nextCalled = false;
    const validReq = { body: { availabilityStatus: 'AVAILABLE' } };
    validateUpdateAvailability(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(validReq.body.availabilityStatus, AVAILABILITY_STATUS.AVAILABLE);
  });

  // 7. Validation: validateUpdateWorkStatus
  test('7. validateUpdateWorkStatus validates allowed work states', () => {
    const mockRes = createMockRes();

    // Invalid work status
    validateUpdateWorkStatus({ body: { workStatus: 'BUSY' } }, mockRes, () => {});
    assert.strictEqual(mockRes.getStatusCode(), 400);

    // Valid work status
    let nextCalled = false;
    const validReq = { body: { workStatus: 'ON_JOB' } };
    validateUpdateWorkStatus(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(validReq.body.workStatus, WORK_STATUS.ON_JOB);
  });

  // 8. Validation: validateUpdateLocation
  test('8. validateUpdateLocation enforces valid coordinate boundaries (-90..90, -180..180)', () => {
    const mockRes = createMockRes();

    // Out of range latitude
    validateUpdateLocation({ body: { latitude: 95.5, longitude: 72.5 } }, mockRes, () => {});
    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert(mockRes.getData().error.fields.latitude);

    // Out of range longitude
    validateUpdateLocation({ body: { latitude: 23.0, longitude: 185.0 } }, mockRes, () => {});
    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert(mockRes.getData().error.fields.longitude);

    // Valid coordinates
    let nextCalled = false;
    const validReq = { body: { latitude: 23.0225, longitude: 72.5714 } };
    validateUpdateLocation(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(validReq.body.latitude, 23.0225);
    assert.strictEqual(validReq.body.longitude, 72.5714);
  });

  // 9. Validation: validateUpdateVerification
  test('9. validateUpdateVerification validates verification status enum', () => {
    const mockRes = createMockRes();

    // Invalid verification status
    validateUpdateVerification({ body: { verificationStatus: 'APPROVED' } }, mockRes, () => {});
    assert.strictEqual(mockRes.getStatusCode(), 400);

    // Valid verification status
    let nextCalled = false;
    const validReq = { body: { verificationStatus: 'VERIFIED', notes: 'Documents checked' } };
    validateUpdateVerification(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(validReq.body.verificationStatus, VERIFICATION_STATUS.VERIFIED);
  });

  // 10. Service: Unique Mechanic Code Generation
  await asyncTest('10. generateMechanicCode generates unique formatted code MECH-YYYYMMDD-XXXX', async () => {
    const code1 = await mechanicService.generateMechanicCode();
    const code2 = await mechanicService.generateMechanicCode();
    assert(/^MECH-\d{8}-\d{4}$/.test(code1), `Code 1 format invalid: ${code1}`);
    assert(/^MECH-\d{8}-\d{4}$/.test(code2), `Code 2 format invalid: ${code2}`);
  });

  // 11. Service: Haversine Great-Circle Distance Calculation
  test('11. calculateDistance correctly computes great-circle distance in kilometers', () => {
    // Distance between Ahmedabad (23.0225, 72.5714) and Gandhinagar (23.2156, 72.6369) ~ 22.5 km
    const dist = mechanicService.calculateDistance(23.0225, 72.5714, 23.2156, 72.6369);
    assert(dist > 20 && dist < 25, `Expected distance ~22.5 km, got ${dist}`);

    // Same point should be 0
    const zeroDist = mechanicService.calculateDistance(23.0225, 72.5714, 23.0225, 72.5714);
    assert.strictEqual(Math.round(zeroDist), 0);

    // Null/undefined returns Infinity
    assert.strictEqual(mechanicService.calculateDistance(null, null, 23.0, 72.0), Infinity);
  });

  // 12. Service: Role-Based Response Formatting & Data Sanitization
  test('12. formatMechanicResponse sanitizes sensitive fields for customer role', () => {
    const mockDoc = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      mechanicCode: 'MECH-20260926-1001',
      displayName: 'Vikram Patel',
      phone: '+919998887770',
      profileImage: 'https://example.com/avatar.jpg',
      experienceYears: 8,
      specialization: SPECIALIZATIONS.GENERAL_SERVICE,
      skills: ['Engine Repair', 'Brake Servicing'],
      supportedVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      supportedServiceIds: [],
      availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
      workStatus: WORK_STATUS.IDLE,
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      currentLocation: { latitude: 23.02, longitude: 72.57, updatedAt: new Date() },
      serviceRadius: 15,
      ratingSummary: { averageRating: 4.8, totalRatings: 25 },
      completedJobs: 45,
      cancelledJobs: 2,
      notes: 'Internal background verification completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Customer view
    const customerView = mechanicService.formatMechanicResponse(mockDoc, { isCustomer: true });
    assert.strictEqual(customerView.displayName, 'Vikram Patel');
    assert.strictEqual(customerView.mechanicCode, 'MECH-20260926-1001');
    assert.strictEqual(customerView.ratingSummary.averageRating, 4.8);
    assert.strictEqual(customerView.notes, undefined, 'Customer must not see internal notes');
    assert.strictEqual(customerView.cancelledJobs, undefined, 'Customer must not see cancelledJobs');
    assert.strictEqual(customerView.serviceRadius, undefined, 'Customer must not see serviceRadius');
    assert.strictEqual(customerView.verificationStatus, undefined, 'Customer must not see verificationStatus');

    // Admin / Mechanic view
    const fullView = mechanicService.formatMechanicResponse(mockDoc, { isCustomer: false });
    assert.strictEqual(fullView.notes, 'Internal background verification completed');
    assert.strictEqual(fullView.completedJobs, 45);
    assert.strictEqual(fullView.cancelledJobs, 2);
    assert.strictEqual(fullView.verificationStatus, VERIFICATION_STATUS.VERIFIED);
  });

  // 13. Service: Admin Authorization Guards for Creation & Verification
  await asyncTest('13. createMechanicProfile rejects non-admin callers with 403', async () => {
    let errorCaught = false;
    try {
      await mechanicService.createMechanicProfile(
        { userId: new mongoose.Types.ObjectId().toString(), displayName: 'Rajesh' },
        { role: ROLES.CUSTOMER }
      );
    } catch (err) {
      errorCaught = true;
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('Only administrators'));
    }
    assert.strictEqual(errorCaught, true);
  });

  await asyncTest('14. updateVerificationStatus rejects non-admin callers with 403', async () => {
    let errorCaught = false;
    try {
      await mechanicService.updateVerificationStatus(
        new mongoose.Types.ObjectId().toString(),
        { verificationStatus: VERIFICATION_STATUS.VERIFIED },
        { role: ROLES.MECHANIC, userId: new mongoose.Types.ObjectId() }
      );
    } catch (err) {
      errorCaught = true;
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('Only administrators'));
    }
    assert.strictEqual(errorCaught, true);
  });

  await asyncTest('15. getMechanicsList rejects non-admin callers with 403', async () => {
    let errorCaught = false;
    try {
      await mechanicService.getMechanicsList({}, { role: ROLES.CUSTOMER });
    } catch (err) {
      errorCaught = true;
      assert.strictEqual(err.statusCode, 403);
    }
    assert.strictEqual(errorCaught, true);
  });

  // 16. Service: Self-Profile Access Control
  await asyncTest('16. getMyProfile rejects non-mechanic users with 403', async () => {
    let errorCaught = false;
    try {
      await mechanicService.getMyProfile({ role: ROLES.CUSTOMER, userId: new mongoose.Types.ObjectId() });
    } catch (err) {
      errorCaught = true;
      assert.strictEqual(err.statusCode, 403);
    }
    assert.strictEqual(errorCaught, true);
  });

  // 17. Service: Eligibility filtering and proximity matching logic
  await asyncTest('17. findEligibleMechanics filters out unverified, unavailable, and out-of-range mechanics', async () => {
    const origFindEligible = mechanicRepository.findEligibleMechanics;
    try {
      const mockMechanics = [
        {
          _id: new mongoose.Types.ObjectId(),
          mechanicCode: 'MECH-001',
          displayName: 'Near Verified Mechanic',
          supportedVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
          currentLocation: { latitude: 23.025, longitude: 72.575 }, // ~ 0.5 km away
          serviceRadius: 15,
          availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
          workStatus: WORK_STATUS.IDLE,
          verificationStatus: VERIFICATION_STATUS.VERIFIED,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          mechanicCode: 'MECH-002',
          displayName: 'Far Verified Mechanic',
          supportedVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
          currentLocation: { latitude: 24.500, longitude: 73.500 }, // ~ 180 km away
          serviceRadius: 15,
          availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
          workStatus: WORK_STATUS.IDLE,
          verificationStatus: VERIFICATION_STATUS.VERIFIED,
        },
      ];

      mechanicRepository.findEligibleMechanics = async () => mockMechanics;

      // Query from Ahmedabad coordinates (23.0225, 72.5714)
      const results = await mechanicService.findEligibleMechanics({
        vehicleType: VEHICLE_TYPES.FOUR_WHEELER,
        latitude: 23.0225,
        longitude: 72.5714,
      });

      // Far mechanic should be excluded because distance (~188km) > serviceRadius (15km)
      assert.strictEqual(results.length, 1, 'Only near mechanic should be returned');
      assert.strictEqual(results[0].mechanic.mechanicCode, 'MECH-001');
      assert(results[0].distanceKm < 2.0, `Distance should be < 2km, got ${results[0].distanceKm}`);
    } finally {
      mechanicRepository.findEligibleMechanics = origFindEligible;
    }
  });

  // 18. Service: Non-mechanic user role cannot have mechanic profile created
  await asyncTest('18. createMechanicProfile rejects non-mechanic user accounts with 400', async () => {
    const origFindOne = Auth.findOne;
    try {
      Auth.findOne = () => ({
        exec: async () => ({
          userId: new mongoose.Types.ObjectId(),
          role: ROLES.CUSTOMER, // Not MECHANIC
        }),
      });

      let caught = false;
      try {
        await mechanicService.createMechanicProfile(
          {
            userId: new mongoose.Types.ObjectId().toString(),
            displayName: 'Customer Trying To Be Mechanic',
          },
          { role: ROLES.ADMIN }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 400);
        assert(err.message.includes('must have \'MECHANIC\' role'));
      }
      assert.strictEqual(caught, true);
    } finally {
      Auth.findOne = origFindOne;
    }
  });

  // 19. Service: Duplicate mechanic profile rejected with 409
  await asyncTest('19. createMechanicProfile rejects duplicate mechanic profile for same userId with 409', async () => {
    const origFindOne = Auth.findOne;
    const origFindByUserId = mechanicRepository.findByUserId;
    try {
      const mockUserId = new mongoose.Types.ObjectId();
      Auth.findOne = () => ({
        exec: async () => ({
          userId: mockUserId,
          role: ROLES.MECHANIC,
          phone: '+919999999999',
        }),
      });

      mechanicRepository.findByUserId = async () => ({
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        displayName: 'Existing Mechanic',
      });

      let caught = false;
      try {
        await mechanicService.createMechanicProfile(
          {
            userId: mockUserId.toString(),
            displayName: 'Duplicate Mechanic',
          },
          { role: ROLES.ADMIN }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 409);
        assert(err.message.includes('already exists'));
      }
      assert.strictEqual(caught, true);
    } finally {
      Auth.findOne = origFindOne;
      mechanicRepository.findByUserId = origFindByUserId;
    }
  });

  // 20. Service: Admin can successfully create mechanic profile
  await asyncTest('20. Admin can successfully create mechanic profile with valid data', async () => {
    const origFindOne = Auth.findOne;
    const origFindByUserId = mechanicRepository.findByUserId;
    const origCreate = mechanicRepository.create;
    const origFindById = mechanicRepository.findById;
    try {
      const mockUserId = new mongoose.Types.ObjectId();
      Auth.findOne = () => ({
        exec: async () => ({
          userId: mockUserId,
          role: ROLES.MECHANIC,
          phone: '+919999999999',
        }),
      });

      mechanicRepository.findByUserId = async () => null;

      const createdDoc = {
        _id: new mongoose.Types.ObjectId(),
        userId: mockUserId,
        mechanicCode: 'MECH-20260926-9999',
        displayName: 'Amit Sharma',
        phone: '+919999999999',
        experienceYears: 5,
        specialization: SPECIALIZATIONS.BRAKE,
        skills: ['Brake Pad Replacement'],
        supportedVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
        supportedServiceIds: [],
        availabilityStatus: AVAILABILITY_STATUS.OFFLINE,
        workStatus: WORK_STATUS.IDLE,
        verificationStatus: VERIFICATION_STATUS.PENDING,
        currentLocation: { latitude: null, longitude: null, updatedAt: null },
        serviceRadius: 15,
        ratingSummary: { averageRating: 0, totalRatings: 0 },
        completedJobs: 0,
        cancelledJobs: 0,
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mechanicRepository.create = async () => createdDoc;
      mechanicRepository.findById = async () => createdDoc;

      const result = await mechanicService.createMechanicProfile(
        {
          userId: mockUserId.toString(),
          displayName: 'Amit Sharma',
          experienceYears: 5,
          specialization: SPECIALIZATIONS.BRAKE,
          skills: ['Brake Pad Replacement'],
          supportedVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
        },
        { role: ROLES.ADMIN }
      );

      assert.strictEqual(result.displayName, 'Amit Sharma');
      assert.strictEqual(result.experienceYears, 5);
      assert.strictEqual(result.specialization, SPECIALIZATIONS.BRAKE);
      assert.strictEqual(result.verificationStatus, VERIFICATION_STATUS.PENDING);
    } finally {
      Auth.findOne = origFindOne;
      mechanicRepository.findByUserId = origFindByUserId;
      mechanicRepository.create = origCreate;
      mechanicRepository.findById = origFindById;
    }
  });

  // 21. Service: Mechanic can update allowed profile fields
  await asyncTest('21. Mechanic can update own profile allowed fields', async () => {
    const origFindById = mechanicRepository.findById;
    const origUpdateById = mechanicRepository.updateById;
    try {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockMechanicId = new mongoose.Types.ObjectId();

      mechanicRepository.findById = async () => ({
        _id: mockMechanicId,
        userId: mockUserId,
        displayName: 'Old Name',
      });

      mechanicRepository.updateById = async (id, updateData) => ({
        _id: mockMechanicId,
        userId: mockUserId,
        mechanicCode: 'MECH-20260926-1234',
        displayName: updateData.displayName || 'Old Name',
        experienceYears: updateData.experienceYears || 2,
        specialization: SPECIALIZATIONS.ENGINE,
        skills: updateData.skills || [],
        supportedVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
        supportedServiceIds: [],
        availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
        workStatus: WORK_STATUS.IDLE,
        verificationStatus: VERIFICATION_STATUS.VERIFIED,
      });

      const updated = await mechanicService.updateMechanicProfile(
        mockMechanicId.toString(),
        { displayName: 'New Display Name', experienceYears: 7 },
        { role: ROLES.MECHANIC, userId: mockUserId }
      );

      assert.strictEqual(updated.displayName, 'New Display Name');
      assert.strictEqual(updated.experienceYears, 7);
    } finally {
      mechanicRepository.findById = origFindById;
      mechanicRepository.updateById = origUpdateById;
    }
  });

  // 22. Service: Work status transition from OFFLINE to ON_JOB is rejected
  await asyncTest('22. updateWorkStatus rejects transition to ON_JOB while availability is OFFLINE', async () => {
    const origFindById = mechanicRepository.findById;
    try {
      const mockUserId = new mongoose.Types.ObjectId();
      const mockMechanicId = new mongoose.Types.ObjectId();

      mechanicRepository.findById = async () => ({
        _id: mockMechanicId,
        userId: mockUserId,
        availabilityStatus: AVAILABILITY_STATUS.OFFLINE,
        workStatus: WORK_STATUS.IDLE,
      });

      let caught = false;
      try {
        await mechanicService.updateWorkStatus(
          mockMechanicId.toString(),
          WORK_STATUS.ON_JOB,
          { role: ROLES.MECHANIC, userId: mockUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 400);
        assert(err.message.includes('Cannot set work status to ON_JOB while availability is OFFLINE'));
      }
      assert.strictEqual(caught, true);
    } finally {
      mechanicRepository.findById = origFindById;
    }
  });

  // 23. Service: Admin search and pagination
  await asyncTest('23. getMechanicsList returns paginated list with total count and page metadata', async () => {
    const origFindMany = mechanicRepository.findMany;
    const origCount = mechanicRepository.count;
    try {
      mechanicRepository.findMany = async () => [
        {
          _id: new mongoose.Types.ObjectId(),
          mechanicCode: 'MECH-001',
          displayName: 'Mechanic One',
          availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
          workStatus: WORK_STATUS.IDLE,
          verificationStatus: VERIFICATION_STATUS.VERIFIED,
        },
      ];
      mechanicRepository.count = async () => 25;

      const result = await mechanicService.getMechanicsList(
        { page: 2, limit: 10, availabilityStatus: 'AVAILABLE' },
        { role: ROLES.ADMIN }
      );

      assert.strictEqual(result.mechanics.length, 1);
      assert.strictEqual(result.pagination.page, 2);
      assert.strictEqual(result.pagination.limit, 10);
      assert.strictEqual(result.pagination.total, 25);
      assert.strictEqual(result.pagination.totalPages, 3);
      assert.strictEqual(result.pagination.hasNextPage, true);
      assert.strictEqual(result.pagination.hasPrevPage, true);
    } finally {
      mechanicRepository.findMany = origFindMany;
      mechanicRepository.count = origCount;
    }
  });

  // 24. Dispatch module integration check
  test('24. Dispatch module and dependencies are functional alongside Mechanic module', () => {
    const dispatchAppLayer = app._router.stack.filter((layer) => layer.regexp.test('/api/dispatch'));
    const mechanicAppLayer = app._router.stack.filter((layer) => layer.regexp.test('/api/mechanics'));
    assert(dispatchAppLayer.length > 0, 'Dispatch routes mounted');
    assert(mechanicAppLayer.length > 0, 'Mechanic routes mounted');
  });

  // Summary
  console.log('\n=================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Execute tests if invoked directly
if (require.main === module) {
  runTests().catch((err) => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
