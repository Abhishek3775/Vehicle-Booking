const assert = require('assert');
const mongoose = require('mongoose');
const quotationService = require('./quotation.service');
const quotationRepository = require('./quotation.repository');
const Quotation = require('./quotation.model');
const Inspection = require('../inspection/inspection.model');
const Booking = require('../booking/booking.model');
const Service = require('../service/service.model');
const {
  QUOTATION_STATUS,
  CUSTOMER_RESPONSE,
  ITEM_TYPES,
  DISCOUNT_TYPES,
  CURRENCIES,
} = require('./quotation.constants');
const {
  validateBookingIdParam,
  validateQuotationIdParam,
  validateCreateQuotation,
  validateRejectQuotation,
} = require('./quotation.validation');
const { INSPECTION_STATUS } = require('../inspection/inspection.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING QUOTATION MODULE COMPREHENSIVE TEST SUITE ---\n');

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
  test('1. Quotation Model is registered and has all required schema paths', () => {
    assert(Quotation.modelName === 'Quotation');
    const paths = Quotation.schema.paths;
    assert(paths['quotationReference'], 'quotationReference missing');
    assert(paths['bookingId'], 'bookingId missing');
    assert(paths['inspectionId'], 'inspectionId missing');
    assert(paths['userId'], 'userId missing');
    assert(paths['vehicleId'], 'vehicleId missing');
    assert(paths['mechanicId'], 'mechanicId missing');
    assert(paths['items'], 'items missing');
    assert(paths['subtotal'], 'subtotal missing');
    assert(paths['discount.type'], 'discount.type missing');
    assert(paths['discount.value'], 'discount.value missing');
    assert(paths['discount.amount'], 'discount.amount missing');
    assert(paths['tax.rate'], 'tax.rate missing');
    assert(paths['tax.amount'], 'tax.amount missing');
    assert(paths['totalAmount'], 'totalAmount missing');
    assert(paths['currency'], 'currency missing');
    assert(paths['status'], 'status missing');
    assert(paths['customerResponse'], 'customerResponse missing');
    assert(paths['customerResponseAt'], 'customerResponseAt missing');
    assert(paths['rejectionReason'], 'rejectionReason missing');
    assert(paths['validUntil'], 'validUntil missing');
    assert(paths['version'], 'version missing');
    assert(paths['parentQuotationId'], 'parentQuotationId missing');
    assert(paths['notes'], 'notes missing');
  });

  // 2. Route Registration in app.js
  test('2. /api/quotations routes are registered in Express app', () => {
    const routeLayers = app._router.stack.filter((layer) => layer.regexp.test('/api/quotations'));
    assert(routeLayers.length > 0, 'Route layer for /api/quotations must exist');
  });

  // 3. Validation: validateBookingIdParam and validateQuotationIdParam
  test('3. validateBookingIdParam and validateQuotationIdParam reject invalid hex ObjectIds', () => {
    const mockRes = createMockRes();
    let nextCalled = false;

    // Invalid bookingId
    validateBookingIdParam({ params: { bookingId: 'bad-id' } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert.strictEqual(nextCalled, false);

    // Invalid quotationId
    nextCalled = false;
    validateQuotationIdParam({ params: { quotationId: 'bad-id' } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(mockRes.getStatusCode(), 400);
    assert.strictEqual(nextCalled, false);

    // Valid IDs
    const validId = new mongoose.Types.ObjectId().toString();
    validateQuotationIdParam({ params: { quotationId: validId } }, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 4. Validation: validateCreateQuotation catches forbidden client financial overrides
  test('4. validateCreateQuotation strictly rejects forbidden fields (subtotal, totalAmount, quotationReference, status, userId)', () => {
    const mockRes = createMockRes();

    validateCreateQuotation(
      {
        body: {
          inspectionId: new mongoose.Types.ObjectId().toString(),
          subtotal: 100,
          totalAmount: 10,
          quotationReference: 'QT-HACK-001',
          status: 'APPROVED',
          userId: new mongoose.Types.ObjectId().toString(),
          items: [{ itemType: 'SERVICE', name: 'Service', quantity: 1, unitPrice: 100 }],
        },
      },
      mockRes,
      () => {}
    );

    assert.strictEqual(mockRes.getStatusCode(), 400);
    const fields = mockRes.getData().error.fields;
    assert(fields.subtotal);
    assert(fields.totalAmount);
    assert(fields.quotationReference);
    assert(fields.status);
    assert(fields.userId);
  });

  // 5. Validation: validateCreateQuotation validates item types, quantities, and prices
  test('5. validateCreateQuotation validates positive quantities and non-negative prices', () => {
    const mockRes = createMockRes();

    // Invalid quantity
    validateCreateQuotation(
      {
        body: {
          inspectionId: new mongoose.Types.ObjectId().toString(),
          items: [
            { itemType: 'LABOUR', name: 'Labour Work', quantity: 0, unitPrice: 500 },
          ],
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(mockRes.getStatusCode(), 400);

    // Negative unitPrice
    validateCreateQuotation(
      {
        body: {
          inspectionId: new mongoose.Types.ObjectId().toString(),
          items: [
            { itemType: 'LABOUR', name: 'Labour Work', quantity: 1, unitPrice: -50 },
          ],
        },
      },
      mockRes,
      () => {}
    );
    assert.strictEqual(mockRes.getStatusCode(), 400);

    // Valid quotation payload
    let nextCalled = false;
    const validReq = {
      body: {
        inspectionId: new mongoose.Types.ObjectId().toString(),
        items: [
          { itemType: 'SERVICE', serviceId: new mongoose.Types.ObjectId().toString(), name: 'Brake Service', quantity: 1, unitPrice: 1500 },
          { itemType: 'PART', name: 'Front Brake Pads', quantity: 2, unitPrice: 1200 },
          { itemType: 'LABOUR', name: 'Installation Labour', quantity: 1, unitPrice: 400 },
        ],
        discount: { type: 'PERCENTAGE', value: 10 },
        tax: { rate: 18 },
        notes: 'Includes 10% seasonal discount',
      },
    };
    validateCreateQuotation(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 6. Validation: validateRejectQuotation requires reason
  test('6. validateRejectQuotation requires non-empty reason of valid length', () => {
    const mockRes = createMockRes();

    validateRejectQuotation({ body: { reason: '' } }, mockRes, () => {});
    assert.strictEqual(mockRes.getStatusCode(), 400);

    let nextCalled = false;
    const validReq = { body: { reason: 'Total estimate is too high compared to market rates' } };
    validateRejectQuotation(validReq, mockRes, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // 7. Service: Unique Quotation Reference Generation
  await asyncTest('7. generateQuotationReference produces valid QT-YYYYMMDD-XXXX format', async () => {
    const ref1 = await quotationService.generateQuotationReference();
    const ref2 = await quotationService.generateQuotationReference();
    assert(/^QT-\d{8}-\d{4}$/.test(ref1), `Ref 1 format invalid: ${ref1}`);
    assert(/^QT-\d{8}-\d{4}$/.test(ref2), `Ref 2 format invalid: ${ref2}`);
  });

  // 8. Service: Server-Side Financial Calculations
  test('8. calculateFinancials accurately computes line totals, subtotal, discount, tax, and totalAmount', () => {
    const items = [
      { name: 'Brake Service', quantity: 1, unitPrice: 1500, discount: 0 },
      { name: 'Brake Pads', quantity: 2, unitPrice: 1000, discount: 100 }, // subtotal: 2000, total: 1900
      { name: 'Labour', quantity: 1, unitPrice: 500, discount: 0 },
    ];
    // subtotal = 1500 + 2000 + 500 = 4000
    // percentage discount 10% = 400
    // taxable = 3600
    // tax 18% = 648
    // total = 4248

    const result = quotationService.calculateFinancials(
      items,
      { type: DISCOUNT_TYPES.PERCENTAGE, value: 10 },
      { rate: 18 }
    );

    assert.strictEqual(result.subtotal, 4000);
    assert.strictEqual(result.discount.amount, 400);
    assert.strictEqual(result.tax.amount, 648);
    assert.strictEqual(result.totalAmount, 4248);
    assert.strictEqual(result.calculatedItems[1].total, 1900);
  });

  // 9. Service: Customer cannot create quotation
  await asyncTest('9. createQuotation rejects customer callers with 403', async () => {
    let caught = false;
    try {
      await quotationService.createQuotation(
        { inspectionId: new mongoose.Types.ObjectId().toString(), items: [] },
        { role: ROLES.CUSTOMER, userId: new mongoose.Types.ObjectId() }
      );
    } catch (err) {
      caught = true;
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('Only mechanics and administrators'));
    }
    assert.strictEqual(caught, true);
  });

  // 10. Service: Quotation cannot be created from incomplete inspection
  await asyncTest('10. createQuotation rejects non-COMPLETED inspection with 400', async () => {
    const origFindById = Inspection.findById;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();

      Inspection.findById = () => ({
        exec: async () => ({
          _id: inspectionId,
          status: INSPECTION_STATUS.IN_PROGRESS, // Not completed
          mechanicId: mechanicUserId,
          bookingId: new mongoose.Types.ObjectId(),
        }),
      });

      let caught = false;
      try {
        await quotationService.createQuotation(
          {
            inspectionId: inspectionId.toString(),
            items: [{ itemType: 'LABOUR', name: 'Inspection Fee', quantity: 1, unitPrice: 300 }],
          },
          { role: ROLES.MECHANIC, userId: mechanicUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 400);
        assert(err.message.includes('must be in COMPLETED status'));
      }
      assert.strictEqual(caught, true);
    } finally {
      Inspection.findById = origFindById;
    }
  });

  // 11. Service: Unauthorized mechanic cannot create quotation
  await asyncTest('11. createQuotation rejects unassigned mechanic with 403', async () => {
    const origFindById = Inspection.findById;
    try {
      const assignedMechanicId = new mongoose.Types.ObjectId();
      const otherMechanicId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();

      Inspection.findById = () => ({
        exec: async () => ({
          _id: inspectionId,
          status: INSPECTION_STATUS.COMPLETED,
          mechanicId: assignedMechanicId,
          bookingId: new mongoose.Types.ObjectId(),
        }),
      });

      let caught = false;
      try {
        await quotationService.createQuotation(
          {
            inspectionId: inspectionId.toString(),
            items: [{ itemType: 'LABOUR', name: 'Repair Labour', quantity: 1, unitPrice: 500 }],
          },
          { role: ROLES.MECHANIC, userId: otherMechanicId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 403);
        assert(err.message.includes('not the assigned mechanic'));
      }
      assert.strictEqual(caught, true);
    } finally {
      Inspection.findById = origFindById;
    }
  });

  // 12. Service: Assigned mechanic creates quotation with valid service and part line items
  await asyncTest('12. Assigned mechanic successfully creates quotation from completed inspection', async () => {
    const origInspFind = Inspection.findById;
    const origBookingFind = Booking.findById;
    const origServiceFind = Service.findById;
    const origLatestQuote = quotationRepository.findLatestByBookingId;
    const origCreate = quotationRepository.create;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const customerUserId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      const inspectionId = new mongoose.Types.ObjectId();
      const vehicleId = new mongoose.Types.ObjectId();
      const serviceId = new mongoose.Types.ObjectId();

      Inspection.findById = () => ({
        exec: async () => ({
          _id: inspectionId,
          status: INSPECTION_STATUS.COMPLETED,
          mechanicId: mechanicUserId,
          userId: customerUserId,
          vehicleId: vehicleId,
          bookingId: bookingId,
        }),
      });

      Booking.findById = () => ({
        exec: async () => ({
          _id: bookingId,
          status: BOOKING_STATUS.QUOTE_PENDING,
          userId: customerUserId,
        }),
      });

      Service.findById = () => ({
        exec: async () => ({
          _id: serviceId,
          name: 'Engine Oil Change',
          shortDescription: 'Synthetic engine oil change',
          basePrice: 1800,
        }),
      });

      quotationRepository.findLatestByBookingId = async () => null;

      quotationRepository.create = async (data) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const quote = await quotationService.createQuotation(
        {
          inspectionId: inspectionId.toString(),
          items: [
            { itemType: 'SERVICE', serviceId: serviceId.toString(), quantity: 1, unitPrice: 1800 },
            { itemType: 'PART', name: 'Oil Filter', quantity: 1, unitPrice: 450 },
            { itemType: 'LABOUR', name: 'Drain and Refill Labour', quantity: 1, unitPrice: 250 },
          ],
          discount: { type: 'FIXED', value: 100 },
          tax: { rate: 18 },
        },
        { role: ROLES.MECHANIC, userId: mechanicUserId }
      );

      assert.strictEqual(quote.status, QUOTATION_STATUS.DRAFT);
      assert.strictEqual(quote.subtotal, 2500); // 1800 + 450 + 250
      assert.strictEqual(quote.discount.amount, 100);
      assert.strictEqual(quote.tax.amount, 432); // (2500 - 100) * 18% = 432
      assert.strictEqual(quote.totalAmount, 2832); // 2400 + 432
      assert.strictEqual(quote.version, 1);
    } finally {
      Inspection.findById = origInspFind;
      Booking.findById = origBookingFind;
      Service.findById = origServiceFind;
      quotationRepository.findLatestByBookingId = origLatestQuote;
      quotationRepository.create = origCreate;
    }
  });

  // 13. Service: Quotation can be submitted for customer approval
  await asyncTest('13. submitQuotation transitions status to PENDING_APPROVAL and updates booking to QUOTE_PENDING', async () => {
    const origFindById = quotationRepository.findById;
    const origSubmit = quotationRepository.submitQuotation;
    const origBookingUpdate = Booking.findByIdAndUpdate;
    try {
      const mechanicUserId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      const quotationId = new mongoose.Types.ObjectId();
      let bookingStatusSet = null;

      quotationRepository.findById = async () => ({
        _id: quotationId,
        bookingId: bookingId,
        mechanicId: mechanicUserId,
        status: QUOTATION_STATUS.DRAFT,
      });

      quotationRepository.submitQuotation = async () => ({
        _id: quotationId,
        bookingId: bookingId,
        mechanicId: mechanicUserId,
        status: QUOTATION_STATUS.PENDING_APPROVAL,
        customerResponse: CUSTOMER_RESPONSE.PENDING,
      });

      Booking.findByIdAndUpdate = (id, update) => {
        bookingStatusSet = update.$set.status;
        return { exec: async () => ({}) };
      };

      const submitted = await quotationService.submitQuotation(
        quotationId.toString(),
        { role: ROLES.MECHANIC, userId: mechanicUserId }
      );

      assert.strictEqual(submitted.status, QUOTATION_STATUS.PENDING_APPROVAL);
      assert.strictEqual(submitted.customerResponse, CUSTOMER_RESPONSE.PENDING);
      assert.strictEqual(bookingStatusSet, BOOKING_STATUS.QUOTE_PENDING);
    } finally {
      quotationRepository.findById = origFindById;
      quotationRepository.submitQuotation = origSubmit;
      Booking.findByIdAndUpdate = origBookingUpdate;
    }
  });

  // 14. Service: Customer can approve valid quotation
  await asyncTest('14. approveQuotation marks quotation as APPROVED and transitions booking to QUOTE_APPROVED', async () => {
    const origFindById = quotationRepository.findById;
    const origApprove = quotationRepository.approveQuotation;
    const origBookingUpdate = Booking.findByIdAndUpdate;
    try {
      const customerUserId = new mongoose.Types.ObjectId();
      const bookingId = new mongoose.Types.ObjectId();
      const quotationId = new mongoose.Types.ObjectId();
      let bookingStatusSet = null;

      quotationRepository.findById = async () => ({
        _id: quotationId,
        bookingId: bookingId,
        userId: customerUserId,
        status: QUOTATION_STATUS.PENDING_APPROVAL,
        validUntil: new Date(Date.now() + 86400000), // tomorrow
      });

      quotationRepository.approveQuotation = async (id, approvedAt) => ({
        _id: quotationId,
        bookingId: bookingId,
        userId: customerUserId,
        status: QUOTATION_STATUS.APPROVED,
        customerResponse: CUSTOMER_RESPONSE.APPROVED,
        approvedAt: approvedAt,
      });

      Booking.findByIdAndUpdate = (id, update) => {
        bookingStatusSet = update.$set.status;
        return { exec: async () => ({}) };
      };

      const approved = await quotationService.approveQuotation(
        quotationId.toString(),
        { role: ROLES.CUSTOMER, userId: customerUserId }
      );

      assert.strictEqual(approved.status, QUOTATION_STATUS.APPROVED);
      assert.strictEqual(approved.customerResponse, CUSTOMER_RESPONSE.APPROVED);
      assert(approved.approvedAt !== null);
      assert.strictEqual(bookingStatusSet, BOOKING_STATUS.QUOTE_APPROVED);
    } finally {
      quotationRepository.findById = origFindById;
      quotationRepository.approveQuotation = origApprove;
      Booking.findByIdAndUpdate = origBookingUpdate;
    }
  });

  // 15. Service: Customer can reject valid quotation with reason
  await asyncTest('15. rejectQuotation marks quotation as REJECTED with rejection reason', async () => {
    const origFindById = quotationRepository.findById;
    const origReject = quotationRepository.rejectQuotation;
    try {
      const customerUserId = new mongoose.Types.ObjectId();
      const quotationId = new mongoose.Types.ObjectId();

      quotationRepository.findById = async () => ({
        _id: quotationId,
        userId: customerUserId,
        status: QUOTATION_STATUS.PENDING_APPROVAL,
        validUntil: new Date(Date.now() + 86400000),
      });

      quotationRepository.rejectQuotation = async (id, { rejectionReason, rejectedAt }) => ({
        _id: quotationId,
        userId: customerUserId,
        status: QUOTATION_STATUS.REJECTED,
        customerResponse: CUSTOMER_RESPONSE.REJECTED,
        rejectionReason: rejectionReason,
        rejectedAt: rejectedAt,
      });

      const rejected = await quotationService.rejectQuotation(
        quotationId.toString(),
        { reason: 'Price is too high for brake pads' },
        { role: ROLES.CUSTOMER, userId: customerUserId }
      );

      assert.strictEqual(rejected.status, QUOTATION_STATUS.REJECTED);
      assert.strictEqual(rejected.customerResponse, CUSTOMER_RESPONSE.REJECTED);
      assert.strictEqual(rejected.rejectionReason, 'Price is too high for brake pads');
      assert(rejected.rejectedAt !== null);
    } finally {
      quotationRepository.findById = origFindById;
      quotationRepository.rejectQuotation = origReject;
    }
  });

  // 16. Service: Expired quotation cannot be approved
  await asyncTest('16. approveQuotation rejects expired quotation with 400', async () => {
    const origFindById = quotationRepository.findById;
    const origExpire = quotationRepository.markExpired;
    try {
      const customerUserId = new mongoose.Types.ObjectId();
      const quotationId = new mongoose.Types.ObjectId();

      quotationRepository.findById = async () => ({
        _id: quotationId,
        userId: customerUserId,
        status: QUOTATION_STATUS.PENDING_APPROVAL,
        validUntil: new Date(Date.now() - 86400000), // yesterday (expired)
      });

      quotationRepository.markExpired = async () => ({});

      let caught = false;
      try {
        await quotationService.approveQuotation(
          quotationId.toString(),
          { role: ROLES.CUSTOMER, userId: customerUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 400);
        assert(err.message.includes('expired'));
      }
      assert.strictEqual(caught, true);
    } finally {
      quotationRepository.findById = origFindById;
      quotationRepository.markExpired = origExpire;
    }
  });

  // 17. Service: Customer privacy - customer cannot view another user's quotation
  await asyncTest('17. getQuotationById prevents unauthorized customer access with 403', async () => {
    const origFindById = quotationRepository.findById;
    try {
      const customerUserId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      const quotationId = new mongoose.Types.ObjectId();

      quotationRepository.findById = async () => ({
        _id: quotationId,
        userId: customerUserId,
        status: QUOTATION_STATUS.PENDING_APPROVAL,
      });

      // Owner customer
      const ownerResult = await quotationService.getQuotationById(
        quotationId.toString(),
        { role: ROLES.CUSTOMER, userId: customerUserId }
      );
      assert(ownerResult.id);

      // Stranger customer
      let caught = false;
      try {
        await quotationService.getQuotationById(
          quotationId.toString(),
          { role: ROLES.CUSTOMER, userId: otherUserId }
        );
      } catch (err) {
        caught = true;
        assert.strictEqual(err.statusCode, 403);
      }
      assert.strictEqual(caught, true);
    } finally {
      quotationRepository.findById = origFindById;
    }
  });

  // Summary
  console.log('\n=================================================');
  console.log(`QUOTATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Unhandled quotation test error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
