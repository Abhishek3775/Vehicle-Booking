const assert = require('assert');
const mongoose = require('mongoose');
const invoiceService = require('./invoice.service');
const invoiceRepository = require('./invoice.repository');
const Invoice = require('./invoice.model');
const Payment = require('../payment/payment.model');
const Quotation = require('../quotation/quotation.model');
const Booking = require('../booking/booking.model');
const User = require('../user/user.model');
const Auth = require('../auth/auth.model');
const Vehicle = require('../vehicle/vehicle.model');
const Address = require('../address/address.model');
const {
  INVOICE_STATUS,
  INVOICE_PAYMENT_STATUS,
  CURRENCIES,
  ITEM_TYPES,
  DISCOUNT_TYPES,
  ALLOWED_INVOICE_STATUS_TRANSITIONS,
} = require('./invoice.constants');
const {
  validateInvoiceIdParam,
  validateBookingIdParam,
  validateGenerateInvoice,
  validateCancelInvoice,
} = require('./invoice.validation');
const { PAYMENT_STATUS } = require('../payment/payment.constants');
const { QUOTATION_STATUS } = require('../quotation/quotation.constants');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING INVOICE MODULE COMPREHENSIVE TEST SUITE ---\n');

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
  test('1. Invoice Model is registered and has all required schema paths and snapshots', () => {
    assert(Invoice.modelName === 'Invoice');
    const paths = Invoice.schema.paths;
    assert(paths['invoiceNumber'], 'invoiceNumber missing');
    assert(paths['invoiceReference'], 'invoiceReference missing');
    assert(paths['bookingId'], 'bookingId missing');
    assert(paths['quotationId'], 'quotationId missing');
    assert(paths['paymentId'], 'paymentId missing');
    assert(paths['userId'], 'userId missing');
    assert(paths['vehicleId'], 'vehicleId missing');
    assert(paths['customerSnapshot.userId'], 'customerSnapshot.userId missing');
    assert(paths['customerSnapshot.name'], 'customerSnapshot.name missing');
    assert(paths['customerSnapshot.phone'], 'customerSnapshot.phone missing');
    assert(paths['vehicleSnapshot.vehicleId'], 'vehicleSnapshot.vehicleId missing');
    assert(paths['vehicleSnapshot.registrationNumber'], 'vehicleSnapshot.registrationNumber missing');
    assert(paths['paymentSnapshot.paymentId'], 'paymentSnapshot.paymentId missing');
    assert(paths['paymentSnapshot.paymentReference'], 'paymentSnapshot.paymentReference missing');
    assert(paths['items'], 'items missing');
    assert(paths['subtotal'], 'subtotal missing');
    assert(paths['discount.type'], 'discount.type missing');
    assert(paths['discount.amount'], 'discount.amount missing');
    assert(paths['tax.rate'], 'tax.rate missing');
    assert(paths['tax.amount'], 'tax.amount missing');
    assert(paths['totalAmount'], 'totalAmount missing');
    assert(paths['amountPaid'], 'amountPaid missing');
    assert(paths['amountDue'], 'amountDue missing');
    assert(paths['currency'], 'currency missing');
    assert(paths['paymentStatus'], 'paymentStatus missing');
    assert(paths['invoiceStatus'], 'invoiceStatus missing');
    assert(paths['issuedAt'], 'issuedAt missing');
    assert(paths['dueAt'], 'dueAt missing');
    assert(paths['cancelledAt'], 'cancelledAt missing');
    assert(paths['cancelledBy'], 'cancelledBy missing');
    assert(paths['cancellationReason'], 'cancellationReason missing');
    assert(paths['notes'], 'notes missing');
    assert(paths['createdAt'], 'createdAt missing');
    assert(paths['updatedAt'], 'updatedAt missing');
  });

  // 2. Constants Verification
  test('2. Invoice constants and allowed transitions are properly defined', () => {
    assert.strictEqual(INVOICE_STATUS.DRAFT, 'DRAFT');
    assert.strictEqual(INVOICE_STATUS.ISSUED, 'ISSUED');
    assert.strictEqual(INVOICE_STATUS.CANCELLED, 'CANCELLED');

    assert.strictEqual(INVOICE_PAYMENT_STATUS.PAID, 'PAID');
    assert.strictEqual(CURRENCIES.INR, 'INR');

    assert(ALLOWED_INVOICE_STATUS_TRANSITIONS[INVOICE_STATUS.ISSUED].includes(INVOICE_STATUS.CANCELLED));
    assert.strictEqual(ALLOWED_INVOICE_STATUS_TRANSITIONS[INVOICE_STATUS.CANCELLED].length, 0);
  });

  // 3. Validation: validateInvoiceIdParam & validateBookingIdParam
  test('3. validateInvoiceIdParam and validateBookingIdParam reject invalid hex ObjectIds', () => {
    const invalidReq = { params: { invoiceId: 'invalid-hex-123', bookingId: 'bad-booking-456' } };
    const res1 = createMockRes();
    validateInvoiceIdParam(invalidReq, res1, () => {});
    assert.strictEqual(res1.getStatusCode(), 400);

    const res2 = createMockRes();
    validateBookingIdParam(invalidReq, res2, () => {});
    assert.strictEqual(res2.getStatusCode(), 400);

    const validId = new mongoose.Types.ObjectId().toString();
    const validReq = { params: { invoiceId: validId, bookingId: validId } };
    let calledNext = false;
    validateInvoiceIdParam(validReq, createMockRes(), () => { calledNext = true; });
    assert(calledNext);
  });

  // 4. Validation: validateGenerateInvoice rejects forbidden client injected amounts
  test('4. validateGenerateInvoice strictly rejects client-provided amounts and entities', () => {
    const validPaymentId = new mongoose.Types.ObjectId().toString();
    const forbiddenPayload = {
      paymentId: validPaymentId,
      amount: 5000,
      totalAmount: 5000,
      subtotal: 4500,
      tax: { rate: 18 },
      discount: { value: 100 },
      userId: new mongoose.Types.ObjectId().toString(),
      quotationId: new mongoose.Types.ObjectId().toString(),
      bookingId: new mongoose.Types.ObjectId().toString(),
      invoiceStatus: 'ISSUED',
    };

    const req = { body: forbiddenPayload };
    const res = createMockRes();
    validateGenerateInvoice(req, res, () => {});

    assert.strictEqual(res.getStatusCode(), 400);
    const data = res.getData();
    assert(data.error.fields.amount, 'amount must be rejected');
    assert(data.error.fields.totalAmount, 'totalAmount must be rejected');
    assert(data.error.fields.subtotal, 'subtotal must be rejected');
    assert(data.error.fields.userId, 'userId must be rejected');
    assert(data.error.fields.quotationId, 'quotationId must be rejected');
  });

  // 5. Validation: validateGenerateInvoice permits valid payload
  test('5. validateGenerateInvoice accepts clean payload containing only paymentId and notes', () => {
    const validPaymentId = new mongoose.Types.ObjectId().toString();
    const req = {
      body: {
        paymentId: validPaymentId,
        notes: 'Customer requested GST invoice copy',
      },
    };
    let called = false;
    validateGenerateInvoice(req, createMockRes(), () => { called = true; });
    assert(called);
    assert.strictEqual(req.body.paymentId, validPaymentId);
    assert.strictEqual(req.body.notes, 'Customer requested GST invoice copy');
  });

  // 6. Validation: validateCancelInvoice
  test('6. validateCancelInvoice requires valid cancellation reason', () => {
    const invalidReq = { body: { cancellationReason: '' } };
    const res = createMockRes();
    validateCancelInvoice(invalidReq, res, () => {});
    assert.strictEqual(res.getStatusCode(), 400);

    const validReq = { body: { cancellationReason: 'Booking cancelled by customer with full waiver' } };
    let called = false;
    validateCancelInvoice(validReq, createMockRes(), () => { called = true; });
    assert(called);
  });

  // 7. Unit/Service: Number and Reference Generation
  await asyncTest('7. generateInvoiceNumber and generateInvoiceReference generate formatted codes', async () => {
    const invNum = await invoiceService.generateInvoiceNumber();
    const invRef = await invoiceService.generateInvoiceReference();

    assert(/^INV-\d{8}-\d{4}$/.test(invNum) || invNum.startsWith('INV-'));
    assert(/^INVREF-[A-Z0-9]+$/.test(invRef));
  });

  // 8. Service: Response formatting preserves historical data and masks internal info
  test('8. formatInvoiceResponse formats all customer-safe fields', () => {
    const mockInvoice = {
      _id: new mongoose.Types.ObjectId(),
      invoiceNumber: 'INV-20260926-0042',
      invoiceReference: 'INVREF-8F92K1',
      bookingId: new mongoose.Types.ObjectId(),
      quotationId: new mongoose.Types.ObjectId(),
      paymentId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      vehicleId: new mongoose.Types.ObjectId(),
      customerSnapshot: { name: 'John Doe', phone: '+919876543210' },
      vehicleSnapshot: { registrationNumber: 'MH02AB1234', make: 'Hyundai', model: 'i20' },
      paymentSnapshot: { paymentMethod: 'RAZORPAY', amountPaid: 4500 },
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          itemType: 'SERVICE',
          name: 'General Service',
          quantity: 1,
          unitPrice: 4500,
          total: 4500,
        },
      ],
      subtotal: 4500,
      totalAmount: 4500,
      amountPaid: 4500,
      amountDue: 0,
      currency: 'INR',
      paymentStatus: 'PAID',
      invoiceStatus: 'ISSUED',
      issuedAt: new Date(),
    };

    const formatted = invoiceService.formatInvoiceResponse(mockInvoice);
    assert.strictEqual(formatted.invoiceNumber, 'INV-20260926-0042');
    assert.strictEqual(formatted.customerSnapshot.name, 'John Doe');
    assert.strictEqual(formatted.items.length, 1);
    assert.strictEqual(formatted.amountPaid, 4500);
    assert.strictEqual(formatted.amountDue, 0);
  });

  // 9. Service: generateInvoice rejects non-existent payment
  await asyncTest('9. generateInvoice: Rejects non-existent payment with 404', async () => {
    const fakePaymentId = new mongoose.Types.ObjectId().toString();
    const fakeUser = { userId: new mongoose.Types.ObjectId().toString(), role: ROLES.CUSTOMER };

    const origFindByPayment = invoiceRepository.findByPaymentId;
    const origFindPaymentById = Payment.findById;

    invoiceRepository.findByPaymentId = async () => null;
    Payment.findById = () => ({
      exec: async () => null,
    });

    try {
      await invoiceService.generateInvoice({ paymentId: fakePaymentId }, fakeUser);
      assert.fail('Should have thrown 404');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
      assert(err.message.includes('Payment record not found'));
    } finally {
      invoiceRepository.findByPaymentId = origFindByPayment;
      Payment.findById = origFindPaymentById;
    }
  });

  // 10. Service: generateInvoice rejects payment not in SUCCESS status
  await asyncTest('10. generateInvoice: Rejects payment not in SUCCESS status with 400', async () => {
    const paymentId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    const origFindByPayment = invoiceRepository.findByPaymentId;
    const origFindPaymentById = Payment.findById;

    invoiceRepository.findByPaymentId = async () => null;
    Payment.findById = () => ({
      exec: async () => ({
        _id: paymentId,
        userId: userId,
        status: PAYMENT_STATUS.FAILED,
        amount: 3000,
      }),
    });

    try {
      await invoiceService.generateInvoice(
        { paymentId },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );
      assert.fail('Should have thrown 400');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Payment must be SUCCESS'));
    } finally {
      invoiceRepository.findByPaymentId = origFindByPayment;
      Payment.findById = origFindPaymentById;
    }
  });

  // 11. Service: generateInvoice rejects unapproved quotation
  await asyncTest('11. generateInvoice: Rejects unapproved quotation with 400', async () => {
    const paymentId = new mongoose.Types.ObjectId().toString();
    const quoteId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const origFindByPayment = invoiceRepository.findByPaymentId;
    const origFindPaymentById = Payment.findById;
    const origFindQuoteById = Quotation.findById;

    invoiceRepository.findByPaymentId = async () => null;
    Payment.findById = () => ({
      exec: async () => ({
        _id: paymentId,
        quotationId: quoteId,
        userId: userId,
        status: PAYMENT_STATUS.SUCCESS,
        amount: 3000,
      }),
    });

    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        status: QUOTATION_STATUS.PENDING_APPROVAL,
        totalAmount: 3000,
      }),
    });

    try {
      await invoiceService.generateInvoice(
        { paymentId },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );
      assert.fail('Should have thrown 400');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Quotation must be APPROVED'));
    } finally {
      invoiceRepository.findByPaymentId = origFindByPayment;
      Payment.findById = origFindPaymentById;
      Quotation.findById = origFindQuoteById;
    }
  });

  // 12. Service: generateInvoice detects financial mismatch between payment and quotation
  await asyncTest('12. generateInvoice: Rejects financial mismatch between payment and quotation', async () => {
    const paymentId = new mongoose.Types.ObjectId().toString();
    const quoteId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const origFindByPayment = invoiceRepository.findByPaymentId;
    const origFindPaymentById = Payment.findById;
    const origFindQuoteById = Quotation.findById;

    invoiceRepository.findByPaymentId = async () => null;
    Payment.findById = () => ({
      exec: async () => ({
        _id: paymentId,
        quotationId: quoteId,
        userId: userId,
        status: PAYMENT_STATUS.SUCCESS,
        amount: 2500, // mismatch
      }),
    });

    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        status: QUOTATION_STATUS.APPROVED,
        totalAmount: 3000, // expected 3000
      }),
    });

    try {
      await invoiceService.generateInvoice(
        { paymentId },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );
      assert.fail('Should have thrown 400');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Financial mismatch'));
    } finally {
      invoiceRepository.findByPaymentId = origFindByPayment;
      Payment.findById = origFindPaymentById;
      Quotation.findById = origFindQuoteById;
    }
  });

  // 13. Service: generateInvoice creates complete immutable snapshots
  await asyncTest('13. generateInvoice: Successfully creates invoice with customer, vehicle, payment, and quotation snapshots', async () => {
    const paymentId = new mongoose.Types.ObjectId();
    const quoteId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();

    const origFindByPayment = invoiceRepository.findByPaymentId;
    const origCreate = invoiceRepository.create;
    const origFindPayment = Payment.findById;
    const origFindQuote = Quotation.findById;
    const origFindBooking = Booking.findById;
    const origFindUser = User.findOne;
    const origFindAuth = Auth.findOne;

    invoiceRepository.findByPaymentId = async () => null;

    Payment.findById = () => ({
      exec: async () => ({
        _id: paymentId,
        paymentReference: 'PAY-20260926-0001',
        quotationId: quoteId,
        bookingId: bookingId,
        userId: userId,
        amount: 5500,
        currency: 'INR',
        paymentMethod: 'RAZORPAY',
        gatewayPaymentId: 'pay_rzp_123456',
        paidAt: new Date('2026-09-26T10:00:00Z'),
        status: PAYMENT_STATUS.SUCCESS,
      }),
    });

    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        bookingId: bookingId,
        userId: userId,
        vehicleId: vehicleId,
        status: QUOTATION_STATUS.APPROVED,
        items: [
          {
            _id: new mongoose.Types.ObjectId(),
            itemType: 'SERVICE',
            name: 'Full Brake Service',
            description: 'Pad replacement and rotor surfacing',
            quantity: 1,
            unitPrice: 3500,
            discount: 0,
            taxRate: 18,
            taxAmount: 630,
            total: 4130,
          },
          {
            _id: new mongoose.Types.ObjectId(),
            itemType: 'PART',
            name: 'Brake Fluid DOT 4',
            quantity: 1,
            unitPrice: 1000,
            discount: 0,
            taxRate: 18,
            taxAmount: 180,
            total: 1180,
          },
        ],
        subtotal: 4500,
        discount: { type: 'FIXED', value: 0, amount: 0 },
        tax: { rate: 18, amount: 810 },
        totalAmount: 5500,
        currency: 'INR',
      }),
    });

    Booking.findById = () => ({
      exec: async () => ({
        _id: bookingId,
        addressSnapshot: {
          fullName: 'Alice Johnson',
          phone: '+919988776655',
          addressLine1: '42 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          country: 'India',
        },
        vehicleSnapshot: {
          vehicleId: vehicleId,
          make: 'Honda',
          model: 'City',
          variant: 'ZX CVT',
          registrationNumber: 'MH01CD5678',
          vehicleType: 'CAR',
          fuelType: 'PETROL',
        },
      }),
    });

    User.findOne = () => ({
      exec: async () => ({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
      }),
    });

    Auth.findOne = () => ({
      exec: async () => ({
        phone: '+919988776655',
        email: 'alice@example.com',
      }),
    });

    let savedData = null;
    invoiceRepository.create = async (doc) => {
      savedData = {
        ...doc,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return savedData;
    };

    try {
      const result = await invoiceService.generateInvoice(
        { paymentId: paymentId.toString() },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );

      assert.strictEqual(result.totalAmount, 5500);
      assert.strictEqual(result.amountPaid, 5500);
      assert.strictEqual(result.amountDue, 0);
      assert.strictEqual(result.customerSnapshot.name, 'Alice Johnson');
      assert.strictEqual(result.customerSnapshot.phone, '+919988776655');
      assert.strictEqual(result.vehicleSnapshot.registrationNumber, 'MH01CD5678');
      assert.strictEqual(result.paymentSnapshot.gatewayPaymentId, 'pay_rzp_123456');
      assert.strictEqual(result.items.length, 2);
      assert(result.invoiceNumber.startsWith('INV-'));
      assert(result.invoiceReference.startsWith('INVREF-'));
    } finally {
      invoiceRepository.findByPaymentId = origFindByPayment;
      invoiceRepository.create = origCreate;
      Payment.findById = origFindPayment;
      Quotation.findById = origFindQuote;
      Booking.findById = origFindBooking;
      User.findOne = origFindUser;
      Auth.findOne = origFindAuth;
    }
  });

  // 14. Service: Duplicate & Idempotent Generation
  await asyncTest('14. generateInvoice: Returns existing invoice idempotently without duplicate records', async () => {
    const paymentId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    const origFindByPayment = invoiceRepository.findByPaymentId;
    invoiceRepository.findByPaymentId = async () => ({
      _id: new mongoose.Types.ObjectId(),
      invoiceNumber: 'INV-20260926-7777',
      invoiceReference: 'INVREF-ABC123',
      paymentId: paymentId,
      userId: userId,
      totalAmount: 4000,
      amountPaid: 4000,
      invoiceStatus: INVOICE_STATUS.ISSUED,
    });

    try {
      const result = await invoiceService.generateInvoice(
        { paymentId },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );

      assert.strictEqual(result.invoiceNumber, 'INV-20260926-7777');
      assert.strictEqual(result.totalAmount, 4000);
    } finally {
      invoiceRepository.findByPaymentId = origFindByPayment;
    }
  });

  // 15. History & Isolation: getInvoiceById
  await asyncTest('15. getInvoiceById: Permits owner and admin, rejects unauthorized customer with 403', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const otherCustomerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const invoiceId = new mongoose.Types.ObjectId().toString();

    const origFindById = invoiceRepository.findById;
    invoiceRepository.findById = async () => ({
      _id: invoiceId,
      invoiceNumber: 'INV-20260926-0001',
      userId: ownerId,
      totalAmount: 2000,
      invoiceStatus: INVOICE_STATUS.ISSUED,
    });

    try {
      // 1. Owner access
      const ownerRes = await invoiceService.getInvoiceById(invoiceId, {
        userId: ownerId.toString(),
        role: ROLES.CUSTOMER,
      });
      assert.strictEqual(ownerRes.id, invoiceId);

      // 2. Admin access
      const adminRes = await invoiceService.getInvoiceById(invoiceId, {
        userId: adminId.toString(),
        role: ROLES.ADMIN,
      });
      assert.strictEqual(adminRes.id, invoiceId);

      // 3. Unauthorized customer
      try {
        await invoiceService.getInvoiceById(invoiceId, {
          userId: otherCustomerId.toString(),
          role: ROLES.CUSTOMER,
        });
        assert.fail('Should have thrown 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }
    } finally {
      invoiceRepository.findById = origFindById;
    }
  });

  // 16. Service: cancelInvoice Admin only
  await asyncTest('16. cancelInvoice: Allows Admin to cancel ISSUED invoice and records reason', async () => {
    const invoiceId = new mongoose.Types.ObjectId().toString();
    const adminId = new mongoose.Types.ObjectId().toString();
    const customerId = new mongoose.Types.ObjectId().toString();

    const origFindById = invoiceRepository.findById;
    const origCancel = invoiceRepository.cancelInvoice;

    invoiceRepository.findById = async () => ({
      _id: invoiceId,
      invoiceStatus: INVOICE_STATUS.ISSUED,
      totalAmount: 1500,
    });

    let cancellationDetails = null;
    invoiceRepository.cancelInvoice = async (id, details) => {
      cancellationDetails = details;
      return {
        _id: id,
        invoiceStatus: INVOICE_STATUS.CANCELLED,
        cancelledAt: details.cancelledAt,
        cancelledBy: details.cancelledBy,
        cancellationReason: details.cancellationReason,
      };
    };

    try {
      // 1. Customer cannot cancel
      try {
        await invoiceService.cancelInvoice(
          invoiceId,
          { cancellationReason: 'Customer requested refund' },
          { userId: customerId, role: ROLES.CUSTOMER }
        );
        assert.fail('Should have rejected customer with 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }

      // 2. Admin can cancel
      const result = await invoiceService.cancelInvoice(
        invoiceId,
        { cancellationReason: 'Administrative correction due to service cancellation' },
        { userId: adminId, role: ROLES.ADMIN }
      );

      assert.strictEqual(result.invoiceStatus, INVOICE_STATUS.CANCELLED);
      assert.strictEqual(cancellationDetails.cancellationReason, 'Administrative correction due to service cancellation');
    } finally {
      invoiceRepository.findById = origFindById;
      invoiceRepository.cancelInvoice = origCancel;
    }
  });

  // 17. Routing: Express app mounts /api/invoices
  test('17. Express app router mounts /api/invoices router correctly', () => {
    const routes = app._router.stack
      .filter((layer) => layer.route || layer.name === 'router')
      .map((layer) => layer.regexp.toString());

    const hasInvoicesRoute = routes.some((r) => r.includes('invoices'));
    assert(hasInvoicesRoute, 'Expected /api/invoices router to be mounted in app.js');
  });

  console.log(`\n--- INVOICE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests when executed directly
if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
