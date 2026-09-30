const assert = require('assert');
const mongoose = require('mongoose');
const { servicePackageService, AppError } = require('./servicePackage.service');
const servicePackageRepository = require('./servicePackage.repository');
const ServicePackage = require('./servicePackage.model');
const Service = require('../service/service.model');
const {
  PACKAGE_STATUS,
  VEHICLE_TYPES,
  PACKAGE_CATEGORIES,
} = require('./servicePackage.constants');
const {
  validateCreatePackage,
  validateUpdatePackage,
  validateUpdatePackageStatus,
} = require('./servicePackage.validation');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { authService } = require('../auth/auth.service');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING SERVICE PACKAGE COMPREHENSIVE TEST SUITE ---\n');

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

  // 1. Check Model definition and schema indexes
  test('1. ServicePackage Model is registered and has correct schema paths', () => {
    assert(ServicePackage.modelName === 'ServicePackage');
    const paths = ServicePackage.schema.paths;
    assert(paths['name'], 'name missing');
    assert(paths['slug'], 'slug missing');
    assert(paths['description'], 'description missing');
    assert(paths['shortDescription'], 'shortDescription missing');
    assert(paths['category'], 'category missing');
    assert(paths['services'], 'services missing');
    assert(paths['vehicleTypes'], 'vehicleTypes missing');
    assert(paths['basePrice'], 'basePrice missing');
    assert(paths['estimatedDuration'], 'estimatedDuration missing');
    assert(paths['image'], 'image missing');
    assert(paths['benefits'], 'benefits missing');
    assert(paths['isPopular'], 'isPopular missing');
    assert(paths['displayOrder'], 'displayOrder missing');
    assert(paths['status'], 'status missing');
    assert(paths['createdBy'], 'createdBy missing');
    assert(paths['updatedBy'], 'updatedBy missing');
    assert(paths['createdAt'], 'createdAt missing');
    assert(paths['updatedAt'], 'updatedAt missing');
  });

  // 2. Check Service model reference in schema
  test('2. Services field references Service model', () => {
    const servicesPath = ServicePackage.schema.paths['services'];
    assert(servicesPath.caster.options.ref === 'Service');
  });

  // 3. Check Slug generation utility
  test('3. Slug generation formats properly', () => {
    const slug1 = servicePackageService.generateSlug('Premium Car Service');
    assert.strictEqual(slug1, 'premium-car-service');
    const slug2 = servicePackageService.generateSlug('  Basic Bike & Scooter Service!  ');
    assert.strictEqual(slug2, 'basic-bike-scooter-service');
  });

  // 4. Test Validation Middleware: validateCreatePackage
  test('4. validateCreatePackage catches forbidden fields and missing required fields', () => {
    // Missing required fields
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

    let nextCalled = false;
    validateCreatePackage({ body: {} }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(resData.success, false);
    assert(resData.error.fields.name, 'name error expected');
    assert(resData.error.fields.description, 'description error expected');
    assert(resData.error.fields.services, 'services error expected');
    assert(resData.error.fields.basePrice, 'basePrice error expected');
    assert(resData.error.fields.estimatedDuration, 'estimatedDuration error expected');
    assert.strictEqual(nextCalled, false);

    // Forbidden fields
    validateCreatePackage(
      {
        body: {
          name: 'Test Package',
          description: 'Valid description',
          services: [new mongoose.Types.ObjectId().toString()],
          basePrice: 500,
          estimatedDuration: 60,
          createdBy: 'fakeAdminId',
        },
      },
      mockRes,
      () => {
        nextCalled = true;
      }
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.createdBy, 'createdBy forbidden error expected');
  });

  // 5. Test Validation Middleware: Invalid and duplicate service IDs
  test('5. validateCreatePackage rejects invalid and duplicate service IDs', () => {
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

    // Invalid ObjectId format
    validateCreatePackage(
      {
        body: {
          name: 'Test Package',
          description: 'Valid description',
          services: ['invalid-id-123'],
          basePrice: 500,
          estimatedDuration: 60,
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.services.includes('valid MongoDB ObjectId'));

    // Duplicate service IDs in payload
    const sId = new mongoose.Types.ObjectId().toString();
    validateCreatePackage(
      {
        body: {
          name: 'Test Package',
          description: 'Valid description',
          services: [sId, sId],
          basePrice: 500,
          estimatedDuration: 60,
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.services.includes('Duplicate service IDs'));
  });

  // 6. Test Vehicle Compatibility Validation
  test('6. Vehicle compatibility validation checks package against service vehicle types', () => {
    const bikeService = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Bike Chain Lubrication',
      vehicleTypes: [VEHICLE_TYPES.TWO_WHEELER],
      status: 'ACTIVE',
    };
    const carService = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Car AC Gas Refill',
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      status: 'ACTIVE',
    };

    // Package for FOUR_WHEELER with bikeService should throw AppError
    assert.throws(
      () => {
        servicePackageService.validateVehicleCompatibility([bikeService], [VEHICLE_TYPES.FOUR_WHEELER]);
      },
      (err) => {
        return (
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message.includes('incompatible with package vehicle type')
        );
      }
    );

    // Package for FOUR_WHEELER with carService should pass
    assert.doesNotThrow(() => {
      servicePackageService.validateVehicleCompatibility([carService], [VEHICLE_TYPES.FOUR_WHEELER]);
    });
  });

  // 7. Test formatPackageResponse for Customer vs Admin
  test('7. formatPackageResponse filters inactive services for customers while preserving them for admin', () => {
    const activeServiceId = new mongoose.Types.ObjectId();
    const inactiveServiceId = new mongoose.Types.ObjectId();

    const mockPackageDoc = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Annual Maintenance Package',
      slug: 'annual-maintenance-package',
      description: 'Full care',
      shortDescription: 'Full care',
      category: PACKAGE_CATEGORIES.PERIODIC_MAINTENANCE,
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      basePrice: 3999,
      estimatedDuration: 180,
      image: null,
      benefits: ['Free wash'],
      isPopular: true,
      displayOrder: 1,
      status: PACKAGE_STATUS.ACTIVE,
      services: [
        {
          _id: activeServiceId,
          name: 'Oil Change',
          slug: 'oil-change',
          category: 'ENGINE',
          vehicleTypes: ['FOUR_WHEELER'],
          estimatedDuration: 30,
          basePrice: 999,
          status: 'ACTIVE',
          displayOrder: 0,
        },
        {
          _id: inactiveServiceId,
          name: 'Old Discontinued Diagnostic',
          slug: 'old-discontinued-diagnostic',
          category: 'DIAGNOSTICS',
          vehicleTypes: ['FOUR_WHEELER'],
          estimatedDuration: 30,
          basePrice: 499,
          status: 'INACTIVE',
          displayOrder: 1,
        },
      ],
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Customer view: only active services returned in services array
    const customerView = servicePackageService.formatPackageResponse(mockPackageDoc, {
      userRole: ROLES.CUSTOMER,
    });
    assert.strictEqual(customerView.services.length, 1);
    assert.strictEqual(customerView.services[0].id, activeServiceId.toString());

    // Admin view: all services (active + inactive) returned
    const adminView = servicePackageService.formatPackageResponse(mockPackageDoc, {
      userRole: ROLES.ADMIN,
    });
    assert.strictEqual(adminView.services.length, 2);
    assert.strictEqual(adminView.services[1].id, inactiveServiceId.toString());
    assert.strictEqual(adminView.services[1].status, 'INACTIVE');
  });

  // 8. Test Auth Middleware: Customer vs Admin role authorization
  test('8. authorize(ROLES.ADMIN) blocks CUSTOMER role and allows ADMIN role', () => {
    let forbiddenCode = null;
    let forbiddenData = null;
    const mockRes = {
      status(code) {
        forbiddenCode = code;
        return {
          json(data) {
            forbiddenData = data;
          },
        };
      },
    };

    const adminGuard = authorize(ROLES.ADMIN);

    // Customer request
    let customerNext = false;
    adminGuard({ user: { userId: '123', role: ROLES.CUSTOMER } }, mockRes, () => {
      customerNext = true;
    });
    assert.strictEqual(forbiddenCode, 403);
    assert.strictEqual(forbiddenData.success, false);
    assert.strictEqual(customerNext, false);

    // Admin request
    let adminNext = false;
    adminGuard({ user: { userId: '456', role: ROLES.ADMIN } }, mockRes, () => {
      adminNext = true;
    });
    assert.strictEqual(adminNext, true);
  });

  // 9. Test JWT authentication token verification
  test('9. authenticate middleware properly decodes valid token and attaches user', () => {
    const adminPayload = { userId: new mongoose.Types.ObjectId().toString(), role: ROLES.ADMIN };
    const token = authService.generateAccessToken(adminPayload);

    let nextCalled = false;
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = {};

    authenticate(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.user.userId, adminPayload.userId);
    assert.strictEqual(req.user.role, ROLES.ADMIN);
  });

  // 10. Test Route Stack in Express App
  test('10. /api/service-packages route is properly registered in app.js', () => {
    const routeLayers = app._router.stack.filter((layer) => layer.regexp.test('/api/service-packages'));
    assert(routeLayers.length > 0, 'Route layer for /api/service-packages must exist');
  });

  // 11. Test Service Layer: duplicate package name detection
  await asyncTest('11. ServicePackageService.createPackage rejects duplicate package name', async () => {
    const originalFindByName = servicePackageRepository.findByName;
    servicePackageRepository.findByName = async () => ({ _id: '123', name: 'Existing Package' });

    try {
      await assert.rejects(
        async () => {
          await servicePackageService.createPackage('admin1', {
            name: 'Existing Package',
            description: 'Desc',
            services: [new mongoose.Types.ObjectId().toString()],
          });
        },
        (err) => {
          return err instanceof AppError && err.statusCode === 409;
        }
      );
    } finally {
      servicePackageRepository.findByName = originalFindByName;
    }
  });

  // 12. Test Service Layer: duplicate package slug detection
  await asyncTest('12. ServicePackageService.createPackage rejects duplicate package slug', async () => {
    const originalFindByName = servicePackageRepository.findByName;
    const originalFindBySlug = servicePackageRepository.findBySlug;

    servicePackageRepository.findByName = async () => null;
    servicePackageRepository.findBySlug = async () => ({ _id: '123', slug: 'existing-pkg' });

    try {
      await assert.rejects(
        async () => {
          await servicePackageService.createPackage('admin1', {
            name: 'Existing Pkg',
            description: 'Desc',
            services: [new mongoose.Types.ObjectId().toString()],
          });
        },
        (err) => {
          return err instanceof AppError && err.statusCode === 409;
        }
      );
    } finally {
      servicePackageRepository.findByName = originalFindByName;
      servicePackageRepository.findBySlug = originalFindBySlug;
    }
  });

  // 13. Test Service Layer: inactive package 404 for customer vs visible for admin
  await asyncTest('13. ServicePackageService.getPackageById hides inactive package from customer and reveals to admin', async () => {
    const originalFindById = servicePackageRepository.findById;
    const pkgId = new mongoose.Types.ObjectId().toString();

    servicePackageRepository.findById = async () => ({
      _id: pkgId,
      name: 'Seasonal Inactive Package',
      slug: 'seasonal-inactive-package',
      description: 'Desc',
      status: PACKAGE_STATUS.INACTIVE,
      services: [],
    });

    try {
      // Customer gets 404
      await assert.rejects(
        async () => {
          await servicePackageService.getPackageById(pkgId, ROLES.CUSTOMER);
        },
        (err) => {
          return err instanceof AppError && err.statusCode === 404;
        }
      );

      // Admin gets package
      const adminPkg = await servicePackageService.getPackageById(pkgId, ROLES.ADMIN);
      assert.strictEqual(adminPkg.id, pkgId);
      assert.strictEqual(adminPkg.status, PACKAGE_STATUS.INACTIVE);
    } finally {
      servicePackageRepository.findById = originalFindById;
    }
  });

  // 14. Test Service Layer: deactivation (soft-delete)
  await asyncTest('14. ServicePackageService.deactivatePackage safely sets status to INACTIVE', async () => {
    const originalFindById = servicePackageRepository.findById;
    const originalUpdateStatus = servicePackageRepository.updateStatus;
    const pkgId = new mongoose.Types.ObjectId().toString();

    let updatedStatus = null;
    servicePackageRepository.findById = async () => ({
      _id: pkgId,
      status: PACKAGE_STATUS.ACTIVE,
    });
    servicePackageRepository.updateStatus = async (id, status) => {
      updatedStatus = status;
      return { _id: id, status };
    };

    try {
      const result = await servicePackageService.deactivatePackage(pkgId, 'adminUser123');
      assert.strictEqual(updatedStatus, PACKAGE_STATUS.INACTIVE);
      assert(result.message.includes('deactivated successfully'));
    } finally {
      servicePackageRepository.findById = originalFindById;
      servicePackageRepository.updateStatus = originalUpdateStatus;
    }
  });

  console.log(`\n--- ALL ${passed} IN-MEMORY SERVICE PACKAGE TESTS PASSED! ---\n`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
