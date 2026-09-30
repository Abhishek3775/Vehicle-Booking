const assert = require('assert');
const mongoose = require('mongoose');
const { partsService, AppError } = require('./parts.service');
const partsRepository = require('./parts.repository');
const Part = require('./parts.model');
const {
  PART_CATEGORIES,
  PART_UNITS,
  PART_STATUS,
  VEHICLE_TYPES,
  STOCK_OPERATIONS,
} = require('./parts.constants');
const {
  validateCreatePart,
  validateUpdatePart,
  validateUpdateStatus,
  validateStockAdjustment,
  validateStockReservation,
  validateStockRelease,
} = require('./parts.validation');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { authService } = require('../auth/auth.service');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING PARTS / INVENTORY COMPREHENSIVE TEST SUITE ---\n');

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
  test('1. Part Model is registered and has correct schema paths', () => {
    assert(Part.modelName === 'Part');
    const paths = Part.schema.paths;
    assert(paths['name'], 'name path missing');
    assert(paths['sku'], 'sku path missing');
    assert(paths['partNumber'], 'partNumber path missing');
    assert(paths['description'], 'description path missing');
    assert(paths['category'], 'category path missing');
    assert(paths['brand'], 'brand path missing');
    assert(paths['compatibleVehicleTypes'], 'compatibleVehicleTypes path missing');
    assert(paths['compatibleMakes'], 'compatibleMakes path missing');
    assert(paths['compatibleModels'], 'compatibleModels path missing');
    assert(paths['unit'], 'unit path missing');
    assert(paths['costPrice'], 'costPrice path missing');
    assert(paths['sellingPrice'], 'sellingPrice path missing');
    assert(paths['stockQuantity'], 'stockQuantity path missing');
    assert(paths['reservedQuantity'], 'reservedQuantity path missing');
    assert(paths['reorderLevel'], 'reorderLevel path missing');
    assert(paths['supplierName'], 'supplierName path missing');
    assert(paths['image'], 'image path missing');
    assert(paths['status'], 'status path missing');
    assert(paths['createdBy'], 'createdBy path missing');
    assert(paths['updatedBy'], 'updatedBy path missing');
    assert(paths['createdAt'], 'createdAt path missing');
    assert(paths['updatedAt'], 'updatedAt path missing');
  });

  // 2. Check Virtuals: availableQuantity and isLowStock
  test('2. Part virtuals calculate availableQuantity and isLowStock properly', () => {
    const doc = new Part({
      name: 'Test Brake Pad',
      sku: 'TEST-PAD-001',
      description: 'Desc',
      category: 'BRAKE',
      brand: 'Bosch',
      costPrice: 500,
      sellingPrice: 800,
      stockQuantity: 10,
      reservedQuantity: 6,
      reorderLevel: 5,
    });

    // available = 10 - 6 = 4 <= 5 (reorderLevel) -> isLowStock: true
    assert.strictEqual(doc.availableQuantity, 4);
    assert.strictEqual(doc.isLowStock, true);

    doc.reservedQuantity = 2;
    // available = 10 - 2 = 8 > 5 -> isLowStock: false
    assert.strictEqual(doc.availableQuantity, 8);
    assert.strictEqual(doc.isLowStock, false);
  });

  // 3. Test Route Registration in App
  test('3. /api/parts route is registered in app.js', () => {
    const routeLayers = app._router.stack.filter((layer) => layer.regexp.test('/api/parts'));
    assert(routeLayers.length > 0, 'Route layer for /api/parts must exist');
  });

  // 4. Test Validation: validateCreatePart
  test('4. validateCreatePart catches missing fields, invalid types, and forbidden fields', () => {
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

    // Missing required fields
    validateCreatePart({ body: {} }, mockRes, () => {});
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(resData.success, false);
    assert(resData.error.fields.name, 'name error expected');
    assert(resData.error.fields.sku, 'sku error expected');
    assert(resData.error.fields.description, 'description error expected');
    assert(resData.error.fields.category, 'category error expected');
    assert(resData.error.fields.brand, 'brand error expected');
    assert(resData.error.fields.costPrice, 'costPrice error expected');
    assert(resData.error.fields.sellingPrice, 'sellingPrice error expected');

    // Forbidden field
    validateCreatePart(
      {
        body: {
          name: 'Oil Filter',
          sku: 'FLT-001',
          description: 'Desc',
          category: 'FILTER',
          brand: 'Fram',
          costPrice: 100,
          sellingPrice: 200,
          createdBy: 'unauthorizedInjection',
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.createdBy, 'createdBy forbidden error expected');
  });

  // 5. Test Validation: validateUpdatePart blocks stockQuantity and reservedQuantity
  test('5. validateUpdatePart prohibits direct modification of stock quantities', () => {
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

    validateUpdatePart(
      {
        body: {
          stockQuantity: 50,
          reservedQuantity: 10,
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.stockQuantity, 'stockQuantity modification forbidden expected');
    assert(resData.error.fields.reservedQuantity, 'reservedQuantity modification forbidden expected');
  });

  // 6. Test Validation: validateStockAdjustment
  test('6. validateStockAdjustment requires valid quantity, operation, and reason', () => {
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

    // Invalid operation & missing reason
    validateStockAdjustment(
      {
        body: {
          quantity: -5,
          operation: 'INVALID_OP',
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(statusCode, 400);
    assert(resData.error.fields.quantity, 'quantity error expected');
    assert(resData.error.fields.operation, 'operation error expected');
    assert(resData.error.fields.reason, 'reason error expected');

    // Valid payload
    let nextCalled = false;
    const validReq = {
      body: {
        quantity: 10,
        operation: 'ADD',
        reason: 'Restocking shipment',
      },
    };
    validateStockAdjustment(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 7. Test formatPartResponse for Admin vs Customer
  test('7. formatPartResponse obscures costPrice and supplierName for non-admins', () => {
    const mockPart = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Synthetic Engine Oil 5W30',
      sku: 'ENG-OIL-5W30-001',
      partNumber: 'EO-5W30',
      description: 'Fully synthetic oil',
      category: 'FLUID',
      brand: 'Castrol',
      compatibleVehicleTypes: ['FOUR_WHEELER'],
      compatibleMakes: ['Honda'],
      compatibleModels: ['City'],
      unit: 'LITRE',
      costPrice: 400,
      sellingPrice: 700,
      stockQuantity: 50,
      reservedQuantity: 10,
      reorderLevel: 15,
      supplierName: 'Castrol Direct Wholesale',
      image: null,
      status: 'ACTIVE',
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Customer view
    const customerView = partsService.formatPartResponse(mockPart, { userRole: ROLES.CUSTOMER });
    assert.strictEqual(customerView.sellingPrice, 700);
    assert.strictEqual(customerView.availableQuantity, 40);
    assert.strictEqual(customerView.costPrice, undefined);
    assert.strictEqual(customerView.supplierName, undefined);
    assert.strictEqual(customerView.stockQuantity, undefined);
    assert.strictEqual(customerView.reservedQuantity, undefined);

    // Admin view
    const adminView = partsService.formatPartResponse(mockPart, { userRole: ROLES.ADMIN });
    assert.strictEqual(adminView.sellingPrice, 700);
    assert.strictEqual(adminView.costPrice, 400);
    assert.strictEqual(adminView.stockQuantity, 50);
    assert.strictEqual(adminView.reservedQuantity, 10);
    assert.strictEqual(adminView.availableQuantity, 40);
    assert.strictEqual(adminView.supplierName, 'Castrol Direct Wholesale');
    assert.strictEqual(adminView.isLowStock, false);
  });

  // 8. Test Vehicle Compatibility Utility
  test('8. isPartCompatibleWithVehicle matches vehicle type, make, and model accurately', () => {
    const part = {
      compatibleVehicleTypes: ['FOUR_WHEELER'],
      compatibleMakes: ['Hyundai', 'Kia'],
      compatibleModels: ['Creta', 'Seltos'],
    };

    // Compatible vehicle
    assert.strictEqual(
      partsService.isPartCompatibleWithVehicle(part, {
        vehicleType: 'FOUR_WHEELER',
        make: 'Hyundai',
        model: 'Creta',
      }),
      true
    );

    // Incompatible vehicle type
    assert.strictEqual(
      partsService.isPartCompatibleWithVehicle(part, {
        vehicleType: 'TWO_WHEELER',
        make: 'Hyundai',
        model: 'Creta',
      }),
      false
    );

    // Incompatible make
    assert.strictEqual(
      partsService.isPartCompatibleWithVehicle(part, {
        vehicleType: 'FOUR_WHEELER',
        make: 'Tata',
        model: 'Nexon',
      }),
      false
    );

    // Incompatible model
    assert.strictEqual(
      partsService.isPartCompatibleWithVehicle(part, {
        vehicleType: 'FOUR_WHEELER',
        make: 'Hyundai',
        model: 'Verna',
      }),
      false
    );
  });

  // 9. Test Service Layer: Duplicate SKU rejection
  await asyncTest('9. createPart rejects duplicate SKU with 409 Conflict', async () => {
    const originalFindBySku = partsRepository.findBySku;
    partsRepository.findBySku = async () => ({ _id: '123', sku: 'EXISTING-SKU-001' });

    try {
      await assert.rejects(
        async () => {
          await partsService.createPart('admin1', {
            name: 'Spark Plug',
            sku: 'EXISTING-SKU-001',
            description: 'Desc',
            category: 'ENGINE',
            brand: 'NGK',
            costPrice: 150,
            sellingPrice: 250,
          });
        },
        (err) => {
          return err instanceof AppError && err.statusCode === 409;
        }
      );
    } finally {
      partsRepository.findBySku = originalFindBySku;
    }
  });

  // 10. Test Service Layer: Stock Adjustment (ADD / REMOVE)
  await asyncTest('10. updateStock ADD increases stock and REMOVE decreases stock safely', async () => {
    const partId = new mongoose.Types.ObjectId().toString();
    const originalFindById = partsRepository.findById;
    const originalAdjustStock = partsRepository.adjustStock;

    partsRepository.findById = async () => ({
      _id: partId,
      name: 'Air Filter',
      stockQuantity: 20,
      reservedQuantity: 5,
    });

    let adjustParams = null;
    partsRepository.adjustStock = async (id, params) => {
      adjustParams = params;
      const newStock =
        params.operation === 'ADD' ? 20 + params.quantity : 20 - params.quantity;
      return {
        _id: id,
        name: 'Air Filter',
        sku: 'FLT-001',
        description: 'Desc',
        category: 'FILTER',
        brand: 'Bosch',
        costPrice: 200,
        sellingPrice: 350,
        unit: 'PIECE',
        stockQuantity: newStock,
        reservedQuantity: 5,
        reorderLevel: 5,
        status: 'ACTIVE',
      };
    };

    try {
      // 1. ADD operation
      const addedResult = await partsService.updateStock(partId, 'admin1', {
        quantity: 10,
        operation: STOCK_OPERATIONS.ADD,
        reason: 'Restocking',
      });
      assert.strictEqual(adjustParams.quantity, 10);
      assert.strictEqual(adjustParams.operation, 'ADD');
      assert.strictEqual(addedResult.stockQuantity, 30);

      // 2. Safe REMOVE operation
      const removedResult = await partsService.updateStock(partId, 'admin1', {
        quantity: 10,
        operation: STOCK_OPERATIONS.REMOVE,
        reason: 'Damaged item return',
      });
      assert.strictEqual(adjustParams.quantity, 10);
      assert.strictEqual(adjustParams.operation, 'REMOVE');
      assert.strictEqual(removedResult.stockQuantity, 10);

      // 3. Unsafe REMOVE (reducing stock below reservedQuantity: 20 - 18 = 2 < 5 reserved)
      await assert.rejects(
        async () => {
          await partsService.updateStock(partId, 'admin1', {
            quantity: 18,
            operation: STOCK_OPERATIONS.REMOVE,
            reason: 'Excess removal',
          });
        },
        (err) => {
          return (
            err instanceof AppError &&
            err.statusCode === 400 &&
            err.message.includes('cannot be reduced below the currently reserved quantity')
          );
        }
      );
    } finally {
      partsRepository.findById = originalFindById;
      partsRepository.adjustStock = originalAdjustStock;
    }
  });

  // 11. CRITICAL CONCURRENCY TEST: Stock Reservation
  await asyncTest('11. CRITICAL TEST: Stock reservation correctly verifies available stock (stock: 10, reserved: 8) and rejects 3 units', async () => {
    const partId = new mongoose.Types.ObjectId().toString();
    const originalFindById = partsRepository.findById;
    const originalReserveStock = partsRepository.reserveStock;

    // Simulate Part document state: stock = 10, reserved = 8 -> available = 2
    let currentDoc = {
      _id: partId,
      name: 'Brake Disc',
      sku: 'BRK-DISC-001',
      description: 'Front disc',
      category: 'BRAKE',
      brand: 'Brembo',
      unit: 'PIECE',
      costPrice: 1500,
      sellingPrice: 2500,
      stockQuantity: 10,
      reservedQuantity: 8,
      reorderLevel: 3,
      status: PART_STATUS.ACTIVE,
    };

    partsRepository.findById = async () => currentDoc;

    let reserveCalled = false;
    partsRepository.reserveStock = async (id, qty) => {
      reserveCalled = true;
      currentDoc.reservedQuantity += qty;
      return currentDoc;
    };

    try {
      // Attempt to reserve 3 units when available is only 2 (10 - 8 = 2)
      await assert.rejects(
        async () => {
          await partsService.reserveStock(partId, 'admin1', 3);
        },
        (err) => {
          return (
            err instanceof AppError &&
            err.statusCode === 400 &&
            err.message.includes('Insufficient available stock')
          );
        }
      );

      // Verify that database operation was not called and inventory state remained unchanged
      assert.strictEqual(reserveCalled, false, 'reserveStock DB operation should not have been called');
      assert.strictEqual(currentDoc.stockQuantity, 10, 'stockQuantity must stay 10');
      assert.strictEqual(currentDoc.reservedQuantity, 8, 'reservedQuantity must stay 8');

      // Now reserve 2 units (available = 2) -> must succeed
      const successResult = await partsService.reserveStock(partId, 'admin1', 2);
      assert.strictEqual(reserveCalled, true);
      assert.strictEqual(currentDoc.stockQuantity, 10);
      assert.strictEqual(currentDoc.reservedQuantity, 10);
      assert.strictEqual(successResult.availableQuantity, 0);
    } finally {
      partsRepository.findById = originalFindById;
      partsRepository.reserveStock = originalReserveStock;
    }
  });

  // 12. Test Stock Release
  await asyncTest('12. Stock release decreases reservedQuantity and prevents over-releasing', async () => {
    const partId = new mongoose.Types.ObjectId().toString();
    const originalFindById = partsRepository.findById;
    const originalReleaseStock = partsRepository.releaseStock;

    const currentDoc = {
      _id: partId,
      name: 'Clutch Plate',
      sku: 'CLT-001',
      description: 'Desc',
      category: 'CLUTCH',
      brand: 'Valeo',
      costPrice: 1200,
      sellingPrice: 2000,
      stockQuantity: 20,
      reservedQuantity: 5,
      reorderLevel: 5,
      status: 'ACTIVE',
    };

    partsRepository.findById = async () => currentDoc;
    partsRepository.releaseStock = async (id, qty) => {
      currentDoc.reservedQuantity -= qty;
      return currentDoc;
    };

    try {
      // Over-release: attempt to release 10 units when reserved is only 5
      await assert.rejects(
        async () => {
          await partsService.releaseStock(partId, 'admin1', 10);
        },
        (err) => {
          return (
            err instanceof AppError &&
            err.statusCode === 400 &&
            err.message.includes('Cannot release')
          );
        }
      );

      // Safe release: release 3 units
      const result = await partsService.releaseStock(partId, 'admin1', 3);
      assert.strictEqual(currentDoc.reservedQuantity, 2);
      assert.strictEqual(currentDoc.stockQuantity, 20);
      assert.strictEqual(result.availableQuantity, 18);
    } finally {
      partsRepository.findById = originalFindById;
      partsRepository.releaseStock = originalReleaseStock;
    }
  });

  // 13. Test Stock Consumption
  await asyncTest('13. consumeStock simultaneously decrements stockQuantity and reservedQuantity', async () => {
    const partId = new mongoose.Types.ObjectId().toString();
    const originalFindById = partsRepository.findById;
    const originalConsumeStock = partsRepository.consumeStock;

    const currentDoc = {
      _id: partId,
      name: 'Battery 12V 45Ah',
      sku: 'BAT-45AH-001',
      description: 'Desc',
      category: 'BATTERY',
      brand: 'Exide',
      costPrice: 3000,
      sellingPrice: 4500,
      stockQuantity: 20,
      reservedQuantity: 5,
      reorderLevel: 5,
      status: 'ACTIVE',
    };

    partsRepository.findById = async () => currentDoc;
    partsRepository.consumeStock = async (id, qty) => {
      currentDoc.stockQuantity -= qty;
      currentDoc.reservedQuantity -= qty;
      return currentDoc;
    };

    try {
      // Consume 2 units
      const result = await partsService.consumeStock(partId, 2, 'admin1');
      assert.strictEqual(currentDoc.stockQuantity, 18);
      assert.strictEqual(currentDoc.reservedQuantity, 3);
      assert.strictEqual(result.availableQuantity, 15);
    } finally {
      partsRepository.findById = originalFindById;
      partsRepository.consumeStock = originalConsumeStock;
    }
  });

  // 14. Test Inactive Part Handling & Deactivation (Soft Delete)
  await asyncTest('14. Inactive parts are hidden from customers and cannot be reserved', async () => {
    const partId = new mongoose.Types.ObjectId().toString();
    const originalFindById = partsRepository.findById;
    const originalUpdateStatus = partsRepository.updateStatus;

    const inactiveDoc = {
      _id: partId,
      name: 'Discontinued Brake Pad',
      sku: 'OLD-PAD-001',
      description: 'Desc',
      category: 'BRAKE',
      brand: 'Generic',
      costPrice: 200,
      sellingPrice: 400,
      stockQuantity: 10,
      reservedQuantity: 0,
      reorderLevel: 2,
      status: PART_STATUS.INACTIVE,
    };

    partsRepository.findById = async () => inactiveDoc;
    partsRepository.updateStatus = async (id, status) => {
      inactiveDoc.status = status;
      return inactiveDoc;
    };

    try {
      // Customer gets 404 for inactive part
      await assert.rejects(
        async () => {
          await partsService.getPartById(partId, ROLES.CUSTOMER);
        },
        (err) => err instanceof AppError && err.statusCode === 404
      );

      // Admin gets inactive part details
      const adminView = await partsService.getPartById(partId, ROLES.ADMIN);
      assert.strictEqual(adminView.id, partId);
      assert.strictEqual(adminView.status, PART_STATUS.INACTIVE);

      // Attempt reservation on inactive part fails with 400
      await assert.rejects(
        async () => {
          await partsService.reserveStock(partId, 'admin1', 2);
        },
        (err) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message.includes('Cannot reserve stock for an inactive part')
      );
    } finally {
      partsRepository.findById = originalFindById;
      partsRepository.updateStatus = originalUpdateStatus;
    }
  });

  console.log(`\n--- ALL ${passed} IN-MEMORY PARTS / INVENTORY TESTS PASSED! ---\n`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
