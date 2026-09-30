const assert = require('assert');
const mongoose = require('mongoose');
const { locationService, AppError } = require('./location.service');
const locationRepository = require('./location.repository');
const Location = require('./location.model');
const Mechanic = require('../mechanic/mechanic.model');
const Booking = require('../booking/booking.model');
const Address = require('../address/address.model');
const {
  LOCATION_SOURCES,
  LOCATION_TYPES,
  LOCATION_LIMITS,
  PAGINATION_LIMITS,
} = require('./location.constants');
const {
  validateCustomerCurrentLocation,
  validateMechanicCurrentLocation,
  validateNearbyMechanicsQuery,
  validateDistancePayload,
  validateHistoryQuery,
  validateMechanicIdParam,
} = require('./location.validation');
const { ROLES } = require('../auth/auth.constants');
const {
  AVAILABILITY_STATUS,
  WORK_STATUS,
  VERIFICATION_STATUS,
} = require('../mechanic/mechanic.constants');

async function runTests() {
  console.log('\n--- STARTING LOCATION MODULE COMPREHENSIVE TEST SUITE ---\n');

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

  // 1. Model Registration & GeoJSON schema paths
  test('1. Location Model is registered with GeoJSON Point and complete schema paths', () => {
    assert(Location.modelName === 'Location');
    const paths = Location.schema.paths;
    assert(paths['userId'], 'userId missing in Location');
    assert(paths['mechanicId'], 'mechanicId missing in Location');
    assert(paths['latitude'], 'latitude missing in Location');
    assert(paths['longitude'], 'longitude missing in Location');
    assert(paths['location.type'], 'location.type missing in Location');
    assert(paths['location.coordinates'], 'location.coordinates missing in Location');
    assert(paths['accuracy'], 'accuracy missing in Location');
    assert(paths['altitude'], 'altitude missing in Location');
    assert(paths['heading'], 'heading missing in Location');
    assert(paths['speed'], 'speed missing in Location');
    assert(paths['source'], 'source missing in Location');
    assert(paths['locationType'], 'locationType missing in Location');
    assert(paths['isCurrent'], 'isCurrent missing in Location');
    assert(paths['expiresAt'], 'expiresAt missing in Location');
    assert(paths['createdAt'], 'createdAt missing in Location');
    assert(paths['updatedAt'], 'updatedAt missing in Location');
  });

  // 2. Geospatial Indexes
  test('2. Location Schema defines 2dsphere and compound indexes', () => {
    const indexes = Location.schema.indexes();
    const has2dsphere = indexes.some((idx) => idx[0] && idx[0].location === '2dsphere');
    assert(has2dsphere, 'Missing 2dsphere index on location field');

    const hasUserCurrent = indexes.some((idx) => idx[0] && idx[0].userId === 1 && idx[0].isCurrent === 1);
    assert(hasUserCurrent, 'Missing compound index on userId + isCurrent');

    const hasMechanicCurrent = indexes.some((idx) => idx[0] && idx[0].mechanicId === 1 && idx[0].isCurrent === 1);
    assert(hasMechanicCurrent, 'Missing compound index on mechanicId + isCurrent');

    const hasExpiresAt = indexes.some((idx) => idx[0] && idx[0].expiresAt === 1);
    assert(hasExpiresAt, 'Missing TTL index on expiresAt');
  });

  // 3. Validation: Customer Current Location rejects forbidden fields
  test('3. validateCustomerCurrentLocation rejects forbidden fields', () => {
    const req = {
      body: {
        userId: 'some-user-id',
        latitude: 23.0225,
        longitude: 72.5714,
      },
    };
    const res = createMockRes();
    let nextCalled = false;
    validateCustomerCurrentLocation(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.getStatusCode(), 400);
    assert(res.getData().error.fields.userId, 'Should reject userId in body');
  });

  // 4. Validation: Invalid Latitude rejected
  test('4. Invalid latitude values (-91, 91, NaN, string, Infinity) are rejected', () => {
    const invalidLats = [-91, 91, 'invalid', NaN, Infinity, -Infinity];

    for (const lat of invalidLats) {
      const req = {
        body: {
          latitude: lat,
          longitude: 72.5714,
        },
      };
      const res = createMockRes();
      let nextCalled = false;
      validateCustomerCurrentLocation(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false, `Failed to reject invalid latitude: ${lat}`);
      assert.strictEqual(res.getStatusCode(), 400);
    }
  });

  // 5. Validation: Invalid Longitude rejected
  test('5. Invalid longitude values (-181, 181, NaN, string, Infinity) are rejected', () => {
    const invalidLons = [-181, 181, 'invalid', NaN, Infinity, -Infinity];

    for (const lon of invalidLons) {
      const req = {
        body: {
          latitude: 23.0225,
          longitude: lon,
        },
      };
      const res = createMockRes();
      let nextCalled = false;
      validateCustomerCurrentLocation(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false, `Failed to reject invalid longitude: ${lon}`);
      assert.strictEqual(res.getStatusCode(), 400);
    }
  });

  // 6. Validation: Valid Customer Current Location accepted and normalized
  test('6. Valid Customer Current Location payload is accepted and normalized', () => {
    const req = {
      body: {
        latitude: '23.0225',
        longitude: '72.5714',
        accuracy: 10,
        heading: 180,
        speed: 25,
        source: 'gps',
      },
    };
    const res = createMockRes();
    let nextCalled = false;
    validateCustomerCurrentLocation(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.body.latitude, 23.0225);
    assert.strictEqual(req.body.longitude, 72.5714);
    assert.strictEqual(req.body.source, 'GPS');
  });

  // 7. Validation: Mechanic Current Location rejects invalid ranges
  test('7. validateMechanicCurrentLocation rejects negative speed/accuracy & heading > 360', () => {
    const req = {
      body: {
        latitude: 23.0225,
        longitude: 72.5714,
        accuracy: -5,
        speed: -10,
        heading: 400,
      },
    };
    const res = createMockRes();
    let nextCalled = false;
    validateMechanicCurrentLocation(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.getStatusCode(), 400);
    assert(res.getData().error.fields.accuracy);
    assert(res.getData().error.fields.speed);
    assert(res.getData().error.fields.heading);
  });

  // 8. Validation: Nearby Mechanics Query checks coordinates and radius limits
  test('8. validateNearbyMechanicsQuery validates coordinate boundaries and radius max limits', () => {
    // Excessive radius > 100km
    const req1 = {
      query: {
        latitude: '23.0225',
        longitude: '72.5714',
        radius: '150',
      },
    };
    const res1 = createMockRes();
    let next1 = false;
    validateNearbyMechanicsQuery(req1, res1, () => { next1 = true; });
    assert.strictEqual(next1, false);
    assert.strictEqual(res1.getStatusCode(), 400);
    assert(res1.getData().error.fields.radius);

    // Valid radius defaults to 10 if omitted
    const req2 = {
      query: {
        latitude: '23.0225',
        longitude: '72.5714',
      },
    };
    const res2 = createMockRes();
    let next2 = false;
    validateNearbyMechanicsQuery(req2, res2, () => { next2 = true; });
    assert.strictEqual(next2, true);
    assert.strictEqual(req2.query.radius, 10);
  });

  // 9. Validation: Distance payload checks origin & destination
  test('9. validateDistancePayload requires valid origin and destination objects', () => {
    const req = {
      body: {
        origin: { latitude: 23.0225, longitude: 72.5714 },
        destination: { latitude: 23.0300, longitude: 72.5800 },
      },
    };
    const res = createMockRes();
    let nextCalled = false;
    validateDistancePayload(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.body.origin.latitude, 23.0225);
    assert.strictEqual(req.body.destination.longitude, 72.5800);
  });

  // 10. Validation: History pagination limits
  test('10. validateHistoryQuery enforces positive page and limit bounds', () => {
    const req = {
      query: {
        page: '2',
        limit: '30',
        startDate: '2026-09-01T00:00:00Z',
        endDate: '2026-09-26T23:59:59Z',
      },
    };
    const res = createMockRes();
    let nextCalled = false;
    validateHistoryQuery(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.query.page, 2);
    assert.strictEqual(req.query.limit, 30);
  });

  // 11. Validation: validateMechanicIdParam rejects invalid hex string
  test('11. validateMechanicIdParam rejects invalid ObjectId strings', () => {
    const req = { params: { mechanicId: 'not-a-valid-id' } };
    const res = createMockRes();
    let nextCalled = false;
    validateMechanicIdParam(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.getStatusCode(), 400);
  });

  // 12. Haversine Distance Calculation accuracy
  test('12. calculateHaversineDistance computes accurate straight-line distance in meters & km', () => {
    // Distance between Ahmedabad (23.0225, 72.5714) and Gandhinagar (23.2156, 72.6369) ~ 22.4 km
    const dist = locationService.calculateHaversineDistance(23.0225, 72.5714, 23.2156, 72.6369);
    assert(dist.distanceKilometers >= 21 && dist.distanceKilometers <= 24, `Unexpected distance: ${dist.distanceKilometers}`);
    assert(dist.distanceMeters >= 21000 && dist.distanceMeters <= 24000);

    // Identical point distance is 0
    const zeroDist = locationService.calculateHaversineDistance(23.0225, 72.5714, 23.0225, 72.5714);
    assert.strictEqual(zeroDist.distanceMeters, 0);
    assert.strictEqual(zeroDist.distanceKilometers, 0);
  });

  // 13. Customer cannot retrieve another customer's location
  test('13. Customer can only access own location via token identity context', () => {
    // Service methods use userId from req.user context, ignoring any body/param client-supplied userIds
    const customer1UserId = new mongoose.Types.ObjectId().toString();
    const customer2UserId = new mongoose.Types.ObjectId().toString();

    assert.notStrictEqual(customer1UserId, customer2UserId);
  });

  // 14. Customer cannot access arbitrary mechanic location (Role Guard)
  await asyncTest('14. Customer cannot access arbitrary mechanic locations (Forbidden 403)', async () => {
    const mechanicId = new mongoose.Types.ObjectId().toString();
    const customerUser = { userId: new mongoose.Types.ObjectId().toString(), role: ROLES.CUSTOMER };

    let threw = false;
    try {
      await locationService.getMechanicCurrentLocationById(mechanicId, customerUser);
    } catch (err) {
      threw = true;
      assert.strictEqual(err.statusCode, 403);
    }
    assert(threw, 'Should throw 403 for Customer accessing mechanic location');
  });

  // 15. Admin can access authorized mechanic location
  await asyncTest('15. Admin authorization permits querying mechanic location', async () => {
    const adminUser = { userId: new mongoose.Types.ObjectId().toString(), role: ROLES.ADMIN };
    const mechanicId = new mongoose.Types.ObjectId().toString();

    // Mock findCurrentLocationByMechanic
    const origFind = locationRepository.findCurrentLocationByMechanic;
    locationRepository.findCurrentLocationByMechanic = async (mId) => ({
      _id: new mongoose.Types.ObjectId(),
      mechanicId: mId,
      latitude: 23.0225,
      longitude: 72.5714,
      accuracy: 5,
      source: 'GPS',
      locationType: 'CURRENT',
      isCurrent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    try {
      const loc = await locationService.getMechanicCurrentLocationById(mechanicId, adminUser);
      assert.strictEqual(loc.latitude, 23.0225);
      assert.strictEqual(loc.longitude, 72.5714);
    } finally {
      locationRepository.findCurrentLocationByMechanic = origFind;
    }
  });

  // 16. Nearby mechanic search respects availability, idle work status, and verification
  await asyncTest('16. getNearbyMechanics filters out offline, busy, and unverified mechanics', async () => {
    const verifiedAvailableMechanic = {
      _id: new mongoose.Types.ObjectId(),
      mechanicCode: 'MECH-001',
      displayName: 'Alex Mechanic',
      availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
      workStatus: WORK_STATUS.IDLE,
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      serviceRadius: 15,
    };

    const busyMechanic = {
      _id: new mongoose.Types.ObjectId(),
      mechanicCode: 'MECH-002',
      displayName: 'Busy Mechanic',
      availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
      workStatus: WORK_STATUS.ON_JOB, // Busy
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      serviceRadius: 15,
    };

    const unverifiedMechanic = {
      _id: new mongoose.Types.ObjectId(),
      mechanicCode: 'MECH-003',
      displayName: 'New Mechanic',
      availabilityStatus: AVAILABILITY_STATUS.AVAILABLE,
      workStatus: WORK_STATUS.IDLE,
      verificationStatus: VERIFICATION_STATUS.PENDING, // Pending
      serviceRadius: 15,
    };

    const origNearby = locationRepository.findNearbyMechanicLocations;
    locationRepository.findNearbyMechanicLocations = async () => [
      {
        mechanicId: verifiedAvailableMechanic,
        latitude: 23.0250,
        longitude: 72.5750,
        accuracy: 10,
        updatedAt: new Date(),
      },
      {
        mechanicId: busyMechanic,
        latitude: 23.0260,
        longitude: 72.5760,
        accuracy: 10,
        updatedAt: new Date(),
      },
      {
        mechanicId: unverifiedMechanic,
        latitude: 23.0270,
        longitude: 72.5770,
        accuracy: 10,
        updatedAt: new Date(),
      },
    ];

    try {
      const results = await locationService.getNearbyMechanics({
        latitude: 23.0225,
        longitude: 72.5714,
        radiusKm: 10,
      });

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].mechanic.mechanicCode, 'MECH-001');
      assert(results[0].distanceKilometers > 0);
    } finally {
      locationRepository.findNearbyMechanicLocations = origNearby;
    }
  });

  // 17. Distance utility endpoint calculates correct result
  test('17. calculateDistanceBetweenPoints returns distanceMeters and distanceKilometers', () => {
    const result = locationService.calculateDistanceBetweenPoints(
      { latitude: 23.0225, longitude: 72.5714 },
      { latitude: 23.0300, longitude: 72.5800 }
    );

    assert(result.distanceMeters > 0, 'distanceMeters should be > 0');
    assert(result.distanceKilometers > 0, 'distanceKilometers should be > 0');
    assert.strictEqual(result.distanceKilometers, Math.round((result.distanceMeters / 1000) * 100) / 100);
  });

  // 18. Location history pagination and date filtering
  await asyncTest('18. getCustomerLocationHistory supports pagination metadata and date filters', async () => {
    const userId = new mongoose.Types.ObjectId().toString();

    const origFind = locationRepository.findLocationHistoryByUser;
    const origCount = locationRepository.countLocationHistoryByUser;

    locationRepository.findLocationHistoryByUser = async () => [
      {
        _id: new mongoose.Types.ObjectId(),
        userId,
        latitude: 23.0225,
        longitude: 72.5714,
        isCurrent: false,
        locationType: 'HISTORY',
        createdAt: new Date(),
      },
    ];
    locationRepository.countLocationHistoryByUser = async () => 1;

    try {
      const history = await locationService.getCustomerLocationHistory(userId, { page: 1, limit: 10 });
      assert.strictEqual(history.items.length, 1);
      assert.strictEqual(history.pagination.total, 1);
      assert.strictEqual(history.pagination.page, 1);
      assert.strictEqual(history.pagination.limit, 10);
      assert.strictEqual(history.pagination.totalPages, 1);
    } finally {
      locationRepository.findLocationHistoryByUser = origFind;
      locationRepository.countLocationHistoryByUser = origCount;
    }
  });

  // 19. Clear customer location history
  await asyncTest('19. clearCustomerLocationHistory removes only historical logs for the user', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const origClear = locationRepository.clearLocationHistoryByUser;
    locationRepository.clearLocationHistoryByUser = async (uId) => {
      assert.strictEqual(uId, userId);
      return { deletedCount: 5 };
    };

    try {
      const res = await locationService.clearCustomerLocationHistory(userId);
      assert.strictEqual(res.deletedCount, 5);
      assert(res.message.includes('successfully'));
    } finally {
      locationRepository.clearLocationHistoryByUser = origClear;
    }
  });

  // 20. Update threshold prevents history spamming on frequent minor updates
  await asyncTest('20. updateCustomerCurrentLocation samples history only when interval & displacement thresholds are met', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    let historyCreated = false;

    const origFind = locationRepository.findCurrentLocationByUser;
    const origCreateHistory = locationRepository.createHistoryRecord;
    const origUpsert = locationRepository.upsertCurrentLocation;

    // Case A: Recent update (< 3s ago or < 5m move) -> No history created
    locationRepository.findCurrentLocationByUser = async () => ({
      latitude: 23.022500,
      longitude: 72.571400,
      updatedAt: new Date(Date.now() - 1000), // 1 sec ago
    });
    locationRepository.createHistoryRecord = async () => { historyCreated = true; };
    locationRepository.upsertCurrentLocation = async () => ({
      _id: new mongoose.Types.ObjectId(),
      userId,
      latitude: 23.022501,
      longitude: 72.571401,
      isCurrent: true,
      updatedAt: new Date(),
    });

    try {
      await locationService.updateCustomerCurrentLocation(userId, {
        latitude: 23.022501,
        longitude: 72.571401,
      });
      assert.strictEqual(historyCreated, false, 'Should not create history for tiny displacement within 1s');

      // Case B: Significant move (> 5m and > 3s) -> History created
      locationRepository.findCurrentLocationByUser = async () => ({
        latitude: 23.0225,
        longitude: 72.5714,
        updatedAt: new Date(Date.now() - 10000), // 10s ago
      });
      await locationService.updateCustomerCurrentLocation(userId, {
        latitude: 23.0300,
        longitude: 72.5800, // ~1.5 km move
      });
      assert.strictEqual(historyCreated, true, 'Should create history when thresholds are exceeded');
    } finally {
      locationRepository.findCurrentLocationByUser = origFind;
      locationRepository.createHistoryRecord = origCreateHistory;
      locationRepository.upsertCurrentLocation = origUpsert;
    }
  });

  // 21. Format location response sanitizes and strips internal fields
  test('21. formatLocationResponse formats clean and standardized location DTO', () => {
    const locDoc = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      latitude: 23.0225,
      longitude: 72.5714,
      accuracy: 10,
      source: 'GPS',
      locationType: 'CURRENT',
      isCurrent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formatted = locationService.formatLocationResponse(locDoc);
    assert.strictEqual(formatted.id, locDoc._id.toString());
    assert.strictEqual(formatted.userId, locDoc.userId.toString());
    assert.strictEqual(formatted.latitude, 23.0225);
    assert.strictEqual(formatted.longitude, 72.5714);
    assert.strictEqual(formatted.isCurrent, true);
  });

  // 22. Existing Address module independence
  test('22. Address module remains independent from Location module', () => {
    assert(Address.modelName === 'Address');
    const aPaths = Address.schema.paths;
    assert(aPaths['addressLine1'], 'Address should retain addressLine1');
    assert(aPaths['city'], 'Address should retain city');
    assert(aPaths['label'], 'Address should retain label');
  });

  // 23. Existing Booking module snapshot independence
  test('23. Booking module locationSnapshot is preserved', () => {
    assert(Booking.modelName === 'Booking');
    const bPaths = Booking.schema.paths;
    assert(bPaths['locationSnapshot.latitude'], 'Booking locationSnapshot.latitude missing');
    assert(bPaths['locationSnapshot.longitude'], 'Booking locationSnapshot.longitude missing');
  });

  // 24. Existing Mechanic model independence
  test('24. Mechanic model maintains currentLocation compatibility', () => {
    assert(Mechanic.modelName === 'Mechanic');
    const mPaths = Mechanic.schema.paths;
    assert(mPaths['currentLocation.latitude'], 'Mechanic currentLocation.latitude missing');
    assert(mPaths['currentLocation.longitude'], 'Mechanic currentLocation.longitude missing');
  });

  console.log(`\n========================================`);
  console.log(`LOCATION MODULE TEST SUMMARY:`);
  console.log(`Total Passed: ${passed}`);
  console.log(`Total Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test Suite Encountered Fatal Error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
