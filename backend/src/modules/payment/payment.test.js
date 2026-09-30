const assert = require('assert');
const crypto = require('crypto');
const mongoose = require('mongoose');
const paymentService = require('./payment.service');
const paymentRepository = require('./payment.repository');
const Payment = require('./payment.model');
const Quotation = require('../quotation/quotation.model');
const Booking = require('../booking/booking.model');
const {
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_GATEWAYS,
  CURRENCIES,
  WEBHOOK_EVENTS,
  ALLOWED_STATUS_TRANSITIONS,
} = require('./payment.constants');
const {
  validatePaymentIdParam,
  validateBookingIdParam,
  validateQuotationIdParam,
  validateCreateOrder,
  validateVerifyPayment,
} = require('./payment.validation');
const { QUOTATION_STATUS } = require('../quotation/quotation.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING PAYMENT MODULE COMPREHENSIVE TEST SUITE ---\n');

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
  test('1. Payment Model is registered and has all required schema paths', () => {
    assert(Payment.modelName === 'Payment');
    const paths = Payment.schema.paths;
    assert(paths['paymentReference'], 'paymentReference missing');
    assert(paths['quotationId'], 'quotationId missing');
    assert(paths['bookingId'], 'bookingId missing');
    assert(paths['userId'], 'userId missing');
    assert(paths['amount'], 'amount missing');
    assert(paths['currency'], 'currency missing');
    assert(paths['paymentMethod'], 'paymentMethod missing');
    assert(paths['paymentGateway'], 'paymentGateway missing');
    assert(paths['gatewayOrderId'], 'gatewayOrderId missing');
    assert(paths['gatewayPaymentId'], 'gatewayPaymentId missing');
    assert(paths['gatewaySignature'], 'gatewaySignature missing');
    assert(paths['status'], 'status missing');
    assert(paths['failureReason'], 'failureReason missing');
    assert(paths['refundAmount'], 'refundAmount missing');
    assert(paths['metadata'], 'metadata missing');
    assert(paths['initiatedAt'], 'initiatedAt missing');
    assert(paths['paidAt'], 'paidAt missing');
    assert(paths['failedAt'], 'failedAt missing');
    assert(paths['cancelledAt'], 'cancelledAt missing');
    assert(paths['createdAt'], 'createdAt missing');
    assert(paths['updatedAt'], 'updatedAt missing');
  });

  // 2. Constants & Status Integrity
  test('2. Constants and status transitions are strictly defined', () => {
    assert.strictEqual(PAYMENT_STATUS.CREATED, 'CREATED');
    assert.strictEqual(PAYMENT_STATUS.PENDING, 'PENDING');
    assert.strictEqual(PAYMENT_STATUS.PROCESSING, 'PROCESSING');
    assert.strictEqual(PAYMENT_STATUS.SUCCESS, 'SUCCESS');
    assert.strictEqual(PAYMENT_STATUS.FAILED, 'FAILED');
    assert.strictEqual(PAYMENT_STATUS.CANCELLED, 'CANCELLED');
    assert.strictEqual(PAYMENT_STATUS.REFUNDED, 'REFUNDED');
    assert.strictEqual(PAYMENT_STATUS.PARTIALLY_REFUNDED, 'PARTIALLY_REFUNDED');

    assert.strictEqual(PAYMENT_METHODS.RAZORPAY, 'RAZORPAY');
    assert.strictEqual(CURRENCIES.INR, 'INR');

    // Transition integrity
    assert(ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.PENDING].includes(PAYMENT_STATUS.SUCCESS));
    assert(!ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.SUCCESS].includes(PAYMENT_STATUS.FAILED));
    assert(!ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.SUCCESS].includes(PAYMENT_STATUS.CANCELLED));
    assert.strictEqual(ALLOWED_STATUS_TRANSITIONS[PAYMENT_STATUS.FAILED].length, 0);
  });

  // 3. Validation: URL Param Validators
  test('3. validatePaymentIdParam, validateBookingIdParam, validateQuotationIdParam reject invalid IDs', () => {
    const invalidReq = { params: { paymentId: 'invalid-id-123', bookingId: 'invalid-id-456', quotationId: 'invalid-id-789' } };
    const res1 = createMockRes();
    validatePaymentIdParam(invalidReq, res1, () => {});
    assert.strictEqual(res1.getStatusCode(), 400);

    const res2 = createMockRes();
    validateBookingIdParam(invalidReq, res2, () => {});
    assert.strictEqual(res2.getStatusCode(), 400);

    const res3 = createMockRes();
    validateQuotationIdParam(invalidReq, res3, () => {});
    assert.strictEqual(res3.getStatusCode(), 400);

    // Valid ObjectIds
    const validId = new mongoose.Types.ObjectId().toString();
    const validReq = { params: { paymentId: validId, bookingId: validId, quotationId: validId } };
    let pNext = false;
    validatePaymentIdParam(validReq, createMockRes(), () => { pNext = true; });
    assert(pNext);
  });

  // 4. Validation: validateCreateOrder forbids client amount/userId/bookingId injection
  test('4. validateCreateOrder strictly rejects forbidden client injected fields', () => {
    const validQuoteId = new mongoose.Types.ObjectId().toString();
    const forbiddenPayload = {
      quotationId: validQuoteId,
      amount: 100,
      userId: new mongoose.Types.ObjectId().toString(),
      bookingId: new mongoose.Types.ObjectId().toString(),
      currency: 'USD',
      status: 'SUCCESS',
    };

    const req = { body: forbiddenPayload };
    const res = createMockRes();
    validateCreateOrder(req, res, () => {});

    assert.strictEqual(res.getStatusCode(), 400);
    const data = res.getData();
    assert(data.error.fields.amount, 'Expected amount forbidden error');
    assert(data.error.fields.userId, 'Expected userId forbidden error');
    assert(data.error.fields.bookingId, 'Expected bookingId forbidden error');
    assert(data.error.fields.status, 'Expected status forbidden error');
  });

  // 5. Validation: validateCreateOrder valid payload
  test('5. validateCreateOrder allows valid payload without amount', () => {
    const validQuoteId = new mongoose.Types.ObjectId().toString();
    const req = {
      body: {
        quotationId: validQuoteId,
        paymentMethod: 'RAZORPAY',
      },
    };
    let called = false;
    validateCreateOrder(req, createMockRes(), () => { called = true; });
    assert(called);
    assert.strictEqual(req.body.quotationId, validQuoteId);
    assert.strictEqual(req.body.paymentMethod, PAYMENT_METHODS.RAZORPAY);
  });

  // 6. Validation: validateVerifyPayment requirements
  test('6. validateVerifyPayment requires gateway orderId, paymentId, and signature', () => {
    const incompleteReq = { body: { razorpay_order_id: 'order_123' } };
    const res = createMockRes();
    validateVerifyPayment(incompleteReq, res, () => {});
    assert.strictEqual(res.getStatusCode(), 400);
    assert(res.getData().error.fields.razorpay_payment_id);
    assert(res.getData().error.fields.razorpay_signature);

    const completeReq = {
      body: {
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_456',
        razorpay_signature: 'sig_789',
      },
    };
    let called = false;
    validateVerifyPayment(completeReq, createMockRes(), () => { called = true; });
    assert(called);
  });

  // 7. Unit/Service: Reference Generation
  await asyncTest('7. generatePaymentReference generates unique format PAY-YYYYMMDD-XXXX', async () => {
    const ref1 = await paymentService.generatePaymentReference();
    const ref2 = await paymentService.generatePaymentReference();
    assert(/^PAY-\d{8}-\d{4}$/.test(ref1) || ref1.startsWith('PAY-'));
    assert.notStrictEqual(ref1, ref2);
  });

  // 8. Service: Response formatting never exposes secrets
  test('8. formatPaymentResponse returns client-safe fields and never exposes secrets', () => {
    const mockPayment = {
      _id: new mongoose.Types.ObjectId(),
      paymentReference: 'PAY-20260926-1234',
      quotationId: new mongoose.Types.ObjectId(),
      bookingId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      amount: 5500,
      currency: 'INR',
      paymentMethod: 'RAZORPAY',
      paymentGateway: 'RAZORPAY',
      gatewayOrderId: 'order_abc123',
      gatewayPaymentId: 'pay_xyz789',
      status: 'PENDING',
      secret: 'SECRET_SHOULD_NOT_LEAK',
    };

    const formatted = paymentService.formatPaymentResponse(mockPayment, { includeGatewayKey: true });
    assert.strictEqual(formatted.amount, 5500);
    assert.strictEqual(formatted.currency, 'INR');
    assert.strictEqual(formatted.paymentReference, 'PAY-20260926-1234');
    assert(!formatted.secret, 'Secret leaked in response');
    assert(!formatted.RAZORPAY_KEY_SECRET, 'Key secret leaked');
    assert(formatted.gatewayKeyId, 'Expected gatewayKeyId to be present when requested');
  });

  // 9. Service: Gateway signature verification logic
  test('9. verifyGatewaySignature cryptographically verifies HMAC SHA-256', () => {
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_12345';
    const orderId = 'order_test_999';
    const paymentId = 'pay_test_888';

    const validSignature = crypto
      .createHmac('sha256', 'test_secret_12345')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = paymentService.verifyGatewaySignature({
      orderId,
      paymentId,
      signature: validSignature,
    });
    assert.strictEqual(isValid, true, 'Valid signature must pass verification');

    const isInvalid = paymentService.verifyGatewaySignature({
      orderId,
      paymentId,
      signature: 'tampered_signature',
    });
    assert.strictEqual(isInvalid, false, 'Tampered signature must fail verification');
  });

  // 10. Service: Webhook signature verification
  test('10. verifyWebhookSignature cryptographically verifies webhook signatures', () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_999';
    const rawBody = JSON.stringify({ event: 'payment.captured', data: { id: '123' } });

    const validSignature = crypto
      .createHmac('sha256', 'test_webhook_secret_999')
      .update(rawBody)
      .digest('hex');

    const isValid = paymentService.verifyWebhookSignature({
      rawBody,
      signature: validSignature,
    });
    assert.strictEqual(isValid, true, 'Valid webhook signature must pass');

    const isInvalid = paymentService.verifyWebhookSignature({
      rawBody,
      signature: 'fake_signature',
    });
    assert.strictEqual(isInvalid, false, 'Invalid webhook signature must fail');
  });

  // 11. Integration / Mocking: createOrder business rules
  await asyncTest('11. createOrder: Rejects non-existent quotation', async () => {
    const fakeQuoteId = new mongoose.Types.ObjectId().toString();
    const fakeUser = { userId: new mongoose.Types.ObjectId().toString(), role: ROLES.CUSTOMER };

    // Stub Quotation.findById
    const originalFindById = Quotation.findById;
    Quotation.findById = () => ({
      exec: async () => null,
    });

    try {
      await paymentService.createOrder({ quotationId: fakeQuoteId }, fakeUser);
      assert.fail('Should have thrown 404');
    } catch (err) {
      assert.strictEqual(err.statusCode, 404);
      assert(err.message.includes('Quotation not found'));
    } finally {
      Quotation.findById = originalFindById;
    }
  });

  await asyncTest('11b. createOrder: Rejects quotation belonging to another customer', async () => {
    const quoteId = new mongoose.Types.ObjectId().toString();
    const ownerUserId = new mongoose.Types.ObjectId();
    const attackerUserId = new mongoose.Types.ObjectId().toString();

    const originalFindById = Quotation.findById;
    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        userId: ownerUserId,
        status: QUOTATION_STATUS.APPROVED,
        totalAmount: 3500,
      }),
    });

    try {
      await paymentService.createOrder(
        { quotationId: quoteId },
        { userId: attackerUserId, role: ROLES.CUSTOMER }
      );
      assert.fail('Should have thrown 403');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert(err.message.includes('own quotations'));
    } finally {
      Quotation.findById = originalFindById;
    }
  });

  await asyncTest('11c. createOrder: Rejects unapproved quotation (e.g. DRAFT or PENDING_APPROVAL)', async () => {
    const quoteId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    const originalFindById = Quotation.findById;
    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        userId: userId,
        status: QUOTATION_STATUS.PENDING_APPROVAL,
        totalAmount: 3500,
      }),
    });

    try {
      await paymentService.createOrder(
        { quotationId: quoteId },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );
      assert.fail('Should have thrown 400');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('Quotation must be APPROVED'));
    } finally {
      Quotation.findById = originalFindById;
    }
  });

  await asyncTest('11d. createOrder: Rejects expired quotation', async () => {
    const quoteId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    const originalFindById = Quotation.findById;
    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        userId: userId,
        status: QUOTATION_STATUS.APPROVED,
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        totalAmount: 3500,
      }),
    });

    try {
      await paymentService.createOrder(
        { quotationId: quoteId },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );
      assert.fail('Should have thrown 400');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('expired'));
    } finally {
      Quotation.findById = originalFindById;
    }
  });

  await asyncTest('11e. createOrder: Duplicate protection prevents creating payment if already SUCCESS', async () => {
    const quoteId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    const origQuoteFind = Quotation.findById;
    const origFindSuccess = paymentRepository.findSuccessfulPaymentByQuotation;

    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        userId: userId,
        status: QUOTATION_STATUS.APPROVED,
        totalAmount: 3500,
      }),
    });

    paymentRepository.findSuccessfulPaymentByQuotation = async () => ({
      _id: new mongoose.Types.ObjectId(),
      status: PAYMENT_STATUS.SUCCESS,
      amount: 3500,
    });

    try {
      await paymentService.createOrder(
        { quotationId: quoteId },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );
      assert.fail('Should have thrown 400');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('already been successfully completed'));
    } finally {
      Quotation.findById = origQuoteFind;
      paymentRepository.findSuccessfulPaymentByQuotation = origFindSuccess;
    }
  });

  await asyncTest('12. createOrder: Successful order creation snapshots amount from Quotation', async () => {
    const quoteId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const origQuoteFind = Quotation.findById;
    const origBookingFind = Booking.findById;
    const origBookingUpdate = Booking.findByIdAndUpdate;
    const origFindSuccess = paymentRepository.findSuccessfulPaymentByQuotation;
    const origFindPending = paymentRepository.findPendingPaymentByQuotation;
    const origCreate = paymentRepository.create;

    Quotation.findById = () => ({
      exec: async () => ({
        _id: quoteId,
        bookingId: bookingId,
        userId: userId,
        status: QUOTATION_STATUS.APPROVED,
        totalAmount: 4850.5,
        currency: 'INR',
      }),
    });

    Booking.findById = () => ({
      exec: async () => ({
        _id: bookingId,
        status: BOOKING_STATUS.QUOTE_APPROVED,
      }),
    });

    let bookingUpdatedStatus = null;
    Booking.findByIdAndUpdate = (id, update) => ({
      exec: async () => {
        bookingUpdatedStatus = update.$set?.status;
      },
    });

    paymentRepository.findSuccessfulPaymentByQuotation = async () => null;
    paymentRepository.findPendingPaymentByQuotation = async () => null;

    let createdDoc = null;
    paymentRepository.create = async (doc) => {
      createdDoc = {
        ...doc,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return createdDoc;
    };

    try {
      const result = await paymentService.createOrder(
        { quotationId: quoteId.toString() },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );

      assert.strictEqual(result.amount, 4850.5);
      assert.strictEqual(result.currency, 'INR');
      assert.strictEqual(result.status, PAYMENT_STATUS.PENDING);
      assert(result.gatewayOrderId.startsWith('order_'));
      assert(result.paymentReference.startsWith('PAY-'));
      assert.strictEqual(bookingUpdatedStatus, BOOKING_STATUS.PAYMENT_PENDING);
    } finally {
      Quotation.findById = origQuoteFind;
      Booking.findById = origBookingFind;
      Booking.findByIdAndUpdate = origBookingUpdate;
      paymentRepository.findSuccessfulPaymentByQuotation = origFindSuccess;
      paymentRepository.findPendingPaymentByQuotation = origFindPending;
      paymentRepository.create = origCreate;
    }
  });

  // 13. Service: verifyPayment logic with signature verification and booking update
  await asyncTest('13. verifyPayment: Valid signature transitions payment to SUCCESS and updates Booking to PAID', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'secret_verify_key';
    const orderId = 'order_verify_123';
    const paymentId = 'pay_verify_456';
    const bookingId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const paymentDocId = new mongoose.Types.ObjectId();

    const signature = crypto
      .createHmac('sha256', 'secret_verify_key')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const origFindByOrder = paymentRepository.findByGatewayOrderId;
    const origMarkSuccess = paymentRepository.markSuccess;
    const origBookingUpdate = Booking.findByIdAndUpdate;

    paymentRepository.findByGatewayOrderId = async (id) => ({
      _id: paymentDocId,
      gatewayOrderId: id,
      bookingId: bookingId,
      userId: userId,
      status: PAYMENT_STATUS.PENDING,
      amount: 2500,
    });

    let markSuccessCalledWith = null;
    paymentRepository.markSuccess = async (id, details) => {
      markSuccessCalledWith = { id, details };
      return {
        _id: id,
        paymentReference: 'PAY-20260926-9999',
        bookingId: bookingId,
        userId: userId,
        status: PAYMENT_STATUS.SUCCESS,
        amount: 2500,
        gatewayPaymentId: details.gatewayPaymentId,
        gatewaySignature: details.gatewaySignature,
        paidAt: details.paidAt,
      };
    };

    let bookingPaidUpdated = false;
    Booking.findByIdAndUpdate = (id, update) => ({
      exec: async () => {
        if (update.$set?.status === BOOKING_STATUS.PAID) {
          bookingPaidUpdated = true;
        }
      },
    });

    try {
      const result = await paymentService.verifyPayment(
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );

      assert.strictEqual(result.status, PAYMENT_STATUS.SUCCESS);
      assert.strictEqual(result.gatewayPaymentId, paymentId);
      assert(bookingPaidUpdated, 'Booking should have been transitioned to PAID');
      assert.strictEqual(markSuccessCalledWith.details.gatewayPaymentId, paymentId);
    } finally {
      paymentRepository.findByGatewayOrderId = origFindByOrder;
      paymentRepository.markSuccess = origMarkSuccess;
      Booking.findByIdAndUpdate = origBookingUpdate;
    }
  });

  // 14. Service: verifyPayment invalid signature marks payment FAILED
  await asyncTest('14. verifyPayment: Invalid signature marks payment FAILED and throws 400', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'secret_verify_key';
    const orderId = 'order_fail_123';
    const paymentId = 'pay_fail_456';
    const userId = new mongoose.Types.ObjectId();
    const paymentDocId = new mongoose.Types.ObjectId();

    const origFindByOrder = paymentRepository.findByGatewayOrderId;
    const origMarkFailed = paymentRepository.markFailed;

    paymentRepository.findByGatewayOrderId = async () => ({
      _id: paymentDocId,
      gatewayOrderId: orderId,
      userId: userId,
      status: PAYMENT_STATUS.PENDING,
      amount: 2500,
    });

    let markFailedCalled = false;
    paymentRepository.markFailed = async (id, details) => {
      markFailedCalled = true;
      assert.strictEqual(details.failureReason, 'Invalid gateway signature');
    };

    try {
      await paymentService.verifyPayment(
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'invalid_sig_abc',
        },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );
      assert.fail('Should have failed signature verification');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(markFailedCalled, 'markFailed should have been called');
    } finally {
      paymentRepository.findByGatewayOrderId = origFindByOrder;
      paymentRepository.markFailed = origMarkFailed;
    }
  });

  // 15. Service: Idempotent repeated verify calls
  await asyncTest('15. verifyPayment: Repeated verification of already SUCCESS payment returns existing record idempotently', async () => {
    const orderId = 'order_idem_123';
    const paymentId = 'pay_idem_456';
    const userId = new mongoose.Types.ObjectId();

    const origFindByOrder = paymentRepository.findByGatewayOrderId;

    paymentRepository.findByGatewayOrderId = async () => ({
      _id: new mongoose.Types.ObjectId(),
      paymentReference: 'PAY-20260926-7777',
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      userId: userId,
      status: PAYMENT_STATUS.SUCCESS,
      amount: 2500,
      paidAt: new Date(),
    });

    try {
      const result = await paymentService.verifyPayment(
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'any_sig',
        },
        { userId: userId.toString(), role: ROLES.CUSTOMER }
      );

      assert.strictEqual(result.status, PAYMENT_STATUS.SUCCESS);
      assert.strictEqual(result.paymentReference, 'PAY-20260926-7777');
    } finally {
      paymentRepository.findByGatewayOrderId = origFindByOrder;
    }
  });

  // 16. Webhook: handleRazorpayWebhook payment.captured
  await asyncTest('16. handleRazorpayWebhook: Processes payment.captured and synchronizes Booking', async () => {
    const orderId = 'order_webhook_123';
    const paymentId = 'pay_webhook_456';
    const bookingId = new mongoose.Types.ObjectId();
    const paymentDocId = new mongoose.Types.ObjectId();

    const origFindByOrder = paymentRepository.findByGatewayOrderId;
    const origMarkSuccess = paymentRepository.markSuccess;
    const origBookingUpdate = Booking.findByIdAndUpdate;

    paymentRepository.findByGatewayOrderId = async () => ({
      _id: paymentDocId,
      gatewayOrderId: orderId,
      bookingId: bookingId,
      status: PAYMENT_STATUS.PENDING,
      amount: 1500,
    });

    let webhookSuccessCalled = false;
    paymentRepository.markSuccess = async (id) => {
      webhookSuccessCalled = true;
      return {
        _id: id,
        bookingId: bookingId,
        status: PAYMENT_STATUS.SUCCESS,
      };
    };

    let bookingPaidUpdated = false;
    Booking.findByIdAndUpdate = (id, update) => ({
      exec: async () => {
        if (update.$set?.status === BOOKING_STATUS.PAID) {
          bookingPaidUpdated = true;
        }
      },
    });

    try {
      const webhookPayload = {
        event: WEBHOOK_EVENTS.PAYMENT_CAPTURED,
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              amount: 150000, // 1500 rupees = 150000 paise
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const result = await paymentService.handleRazorpayWebhook(webhookPayload, signature, rawBody);
      assert.strictEqual(result.status, 'SUCCESS');
      assert(webhookSuccessCalled);
      assert(bookingPaidUpdated);
    } finally {
      paymentRepository.findByGatewayOrderId = origFindByOrder;
      paymentRepository.markSuccess = origMarkSuccess;
      Booking.findByIdAndUpdate = origBookingUpdate;
    }
  });

  // 17. Webhook: Amount mismatch is recorded
  await asyncTest('17. handleRazorpayWebhook: Detects amount mismatch and records failure', async () => {
    const orderId = 'order_mismatch_123';
    const paymentDocId = new mongoose.Types.ObjectId();

    const origFindByOrder = paymentRepository.findByGatewayOrderId;
    const origMarkFailed = paymentRepository.markFailed;

    paymentRepository.findByGatewayOrderId = async () => ({
      _id: paymentDocId,
      gatewayOrderId: orderId,
      status: PAYMENT_STATUS.PENDING,
      amount: 1500, // Expected 150000 paise
    });

    let failureRecorded = false;
    paymentRepository.markFailed = async (id, details) => {
      failureRecorded = true;
      assert(details.failureReason.includes('amount mismatch'));
    };

    try {
      const webhookPayload = {
        event: WEBHOOK_EVENTS.PAYMENT_CAPTURED,
        payload: {
          payment: {
            entity: {
              id: 'pay_mismatch',
              order_id: orderId,
              amount: 50000, // 500 rupees instead of 1500
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const result = await paymentService.handleRazorpayWebhook(webhookPayload, signature, rawBody);
      assert.strictEqual(result.status, 'AMOUNT_MISMATCH_RECORDED');
      assert(failureRecorded);
    } finally {
      paymentRepository.findByGatewayOrderId = origFindByOrder;
      paymentRepository.markFailed = origMarkFailed;
    }
  });

  // 18. Webhook: Idempotent duplicate processing
  await asyncTest('18. handleRazorpayWebhook: Idempotently acknowledges duplicate events on settled payments', async () => {
    const orderId = 'order_duplicate_123';

    const origFindByOrder = paymentRepository.findByGatewayOrderId;
    paymentRepository.findByGatewayOrderId = async () => ({
      _id: new mongoose.Types.ObjectId(),
      status: PAYMENT_STATUS.SUCCESS,
      amount: 1500,
    });

    try {
      const webhookPayload = {
        event: WEBHOOK_EVENTS.PAYMENT_CAPTURED,
        payload: {
          payment: {
            entity: {
              id: 'pay_dup',
              order_id: orderId,
              amount: 150000,
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const result = await paymentService.handleRazorpayWebhook(webhookPayload, signature, rawBody);
      assert.strictEqual(result.status, 'ALREADY_PROCESSED');
    } finally {
      paymentRepository.findByGatewayOrderId = origFindByOrder;
    }
  });

  // 19. History: Authorization boundaries
  await asyncTest('19. getPaymentById, getPaymentsByBookingId, getPaymentsByQuotationId enforce customer & admin isolation', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const otherCustomerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId().toString();

    const origFindById = paymentRepository.findById;
    paymentRepository.findById = async () => ({
      _id: paymentId,
      paymentReference: 'PAY-20260926-0001',
      userId: ownerId,
      amount: 1200,
      status: PAYMENT_STATUS.SUCCESS,
    });

    try {
      // 1. Owner can access
      const ownerRes = await paymentService.getPaymentById(paymentId, {
        userId: ownerId.toString(),
        role: ROLES.CUSTOMER,
      });
      assert.strictEqual(ownerRes.id, paymentId);

      // 2. Admin can access
      const adminRes = await paymentService.getPaymentById(paymentId, {
        userId: adminId.toString(),
        role: ROLES.ADMIN,
      });
      assert.strictEqual(adminRes.id, paymentId);

      // 3. Other customer is rejected with 403
      try {
        await paymentService.getPaymentById(paymentId, {
          userId: otherCustomerId.toString(),
          role: ROLES.CUSTOMER,
        });
        assert.fail('Should have thrown 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }
    } finally {
      paymentRepository.findById = origFindById;
    }
  });

  // 20. App routing verification: app mounts /api/payments
  test('20. App router mounts /api/payments routes correctly', () => {
    const routes = app._router.stack
      .filter((layer) => layer.route || layer.name === 'router')
      .map((layer) => layer.regexp.toString());

    const hasPaymentsRoute = routes.some((r) => r.includes('payments'));
    assert(hasPaymentsRoute, 'Expected /api/payments router to be mounted in app.js');
  });

  console.log(`\n--- PAYMENT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
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
