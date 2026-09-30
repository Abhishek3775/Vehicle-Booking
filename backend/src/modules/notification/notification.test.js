const assert = require('assert');
const mongoose = require('mongoose');
const notificationService = require('./notification.service');
const notificationRepository = require('./notification.repository');
const notificationProvider = require('./notification.provider');
const Notification = require('./notification.model');
const DeviceToken = require('./device-token.model');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  DELIVERY_STATUS,
  DEVICE_PLATFORMS,
} = require('./notification.constants');
const {
  validateNotificationIdParam,
  validateDeviceIdParam,
  validateRegisterDevice,
  validateGetNotificationsQuery,
} = require('./notification.validation');
const { ROLES } = require('../auth/auth.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING NOTIFICATION MODULE COMPREHENSIVE TEST SUITE ---\n');

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
  test('1. Notification and DeviceToken Models are registered with complete schema paths', () => {
    assert(Notification.modelName === 'Notification');
    const nPaths = Notification.schema.paths;
    assert(nPaths['userId'], 'userId missing');
    assert(nPaths['title'], 'title missing');
    assert(nPaths['message'], 'message missing');
    assert(nPaths['type'], 'type missing');
    assert(nPaths['category'], 'category missing');
    assert(nPaths['entityType'], 'entityType missing');
    assert(nPaths['entityId'], 'entityId missing');
    assert(nPaths['bookingId'], 'bookingId missing');
    assert(nPaths['metadata'], 'metadata missing');
    assert(nPaths['channels'], 'channels missing');
    assert(nPaths['isRead'], 'isRead missing');
    assert(nPaths['readAt'], 'readAt missing');
    assert(nPaths['deliveryStatus'], 'deliveryStatus missing');
    assert(nPaths['isDeleted'], 'isDeleted missing');
    assert(nPaths['createdAt'], 'createdAt missing');
    assert(nPaths['updatedAt'], 'updatedAt missing');

    assert(DeviceToken.modelName === 'DeviceToken');
    const dPaths = DeviceToken.schema.paths;
    assert(dPaths['userId'], 'userId missing in DeviceToken');
    assert(dPaths['token'], 'token missing in DeviceToken');
    assert(dPaths['platform'], 'platform missing in DeviceToken');
    assert(dPaths['deviceId'], 'deviceId missing in DeviceToken');
    assert(dPaths['isActive'], 'isActive missing in DeviceToken');
    assert(dPaths['lastUsedAt'], 'lastUsedAt missing in DeviceToken');
  });

  // 2. Constants Verification
  test('2. Notification constants, categories, and channels are defined', () => {
    assert.strictEqual(NOTIFICATION_TYPES.BOOKING_CREATED, 'BOOKING_CREATED');
    assert.strictEqual(NOTIFICATION_TYPES.MECHANIC_ASSIGNED, 'MECHANIC_ASSIGNED');
    assert.strictEqual(NOTIFICATION_TYPES.INSPECTION_COMPLETED, 'INSPECTION_COMPLETED');
    assert.strictEqual(NOTIFICATION_TYPES.QUOTATION_SUBMITTED, 'QUOTATION_SUBMITTED');
    assert.strictEqual(NOTIFICATION_TYPES.PAYMENT_SUCCESS, 'PAYMENT_SUCCESS');
    assert.strictEqual(NOTIFICATION_TYPES.INVOICE_GENERATED, 'INVOICE_GENERATED');

    assert.strictEqual(NOTIFICATION_CATEGORIES.BOOKING, 'BOOKING');
    assert.strictEqual(NOTIFICATION_CATEGORIES.PAYMENT, 'PAYMENT');
    assert.strictEqual(NOTIFICATION_CHANNELS.IN_APP, 'IN_APP');
    assert.strictEqual(NOTIFICATION_CHANNELS.PUSH, 'PUSH');
    assert.strictEqual(DELIVERY_STATUS.SENT, 'SENT');
    assert.strictEqual(DEVICE_PLATFORMS.ANDROID, 'ANDROID');
  });

  // 3. Validation: validateNotificationIdParam & validateDeviceIdParam
  test('3. validateNotificationIdParam and validateDeviceIdParam validate parameters properly', () => {
    const invalidReq = { params: { notificationId: 'bad-id-123', deviceId: '   ' } };
    const res1 = createMockRes();
    validateNotificationIdParam(invalidReq, res1, () => {});
    assert.strictEqual(res1.getStatusCode(), 400);

    const res2 = createMockRes();
    validateDeviceIdParam(invalidReq, res2, () => {});
    assert.strictEqual(res2.getStatusCode(), 400);

    const validId = new mongoose.Types.ObjectId().toString();
    const validReq = { params: { notificationId: validId, deviceId: 'device-xyz-123' } };
    let nCalled = false;
    validateNotificationIdParam(validReq, createMockRes(), () => { nCalled = true; });
    assert(nCalled);

    let dCalled = false;
    validateDeviceIdParam(validReq, createMockRes(), () => { dCalled = true; });
    assert(dCalled);
    assert.strictEqual(validReq.params.deviceId, 'device-xyz-123');
  });

  // 4. Validation: validateRegisterDevice forbids client userId injection
  test('4. validateRegisterDevice strictly forbids client-provided userId and verifies required fields', () => {
    const forbiddenReq = {
      body: {
        userId: new mongoose.Types.ObjectId().toString(),
        token: 'fcm_token_abc',
        platform: 'ANDROID',
        deviceId: 'phone-123',
      },
    };
    const res = createMockRes();
    validateRegisterDevice(forbiddenReq, res, () => {});
    assert.strictEqual(res.getStatusCode(), 400);
    assert(res.getData().error.fields.userId);

    const missingReq = { body: { token: 'fcm_token_abc' } };
    const res2 = createMockRes();
    validateRegisterDevice(missingReq, res2, () => {});
    assert.strictEqual(res2.getStatusCode(), 400);
    assert(res2.getData().error.fields.platform);
    assert(res2.getData().error.fields.deviceId);

    const validReq = {
      body: {
        token: '  fcm_token_abc  ',
        platform: 'ios',
        deviceId: '  phone-123  ',
      },
    };
    let called = false;
    validateRegisterDevice(validReq, createMockRes(), () => { called = true; });
    assert(called);
    assert.strictEqual(validReq.body.token, 'fcm_token_abc');
    assert.strictEqual(validReq.body.platform, 'IOS');
    assert.strictEqual(validReq.body.deviceId, 'phone-123');
  });

  // 5. Validation: validateGetNotificationsQuery
  test('5. validateGetNotificationsQuery validates query filters', () => {
    const invalidReq = { query: { page: '0', limit: '100', isRead: 'maybe', category: 'UNKNOWN' } };
    const res = createMockRes();
    validateGetNotificationsQuery(invalidReq, res, () => {});
    assert.strictEqual(res.getStatusCode(), 400);

    const validReq = { query: { page: '2', limit: '15', isRead: 'true', category: 'BOOKING' } };
    let called = false;
    validateGetNotificationsQuery(validReq, createMockRes(), () => { called = true; });
    assert(called);
  });

  // 6. Service: Response formatting never exposes sensitive tokens
  test('6. formatNotificationResponse formats fields and protects privacy', () => {
    const mockNotification = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      title: 'Payment Confirmed',
      message: 'Your payment was successful.',
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      category: NOTIFICATION_CATEGORIES.PAYMENT,
      entityType: 'PAYMENT',
      entityId: new mongoose.Types.ObjectId(),
      bookingId: new mongoose.Types.ObjectId(),
      metadata: { paymentReference: 'PAY-20260926-0001', amount: 3500 },
      channels: ['IN_APP', 'PUSH'],
      isRead: false,
      deliveryStatus: 'SENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formatted = notificationService.formatNotificationResponse(mockNotification);
    assert.strictEqual(formatted.title, 'Payment Confirmed');
    assert.strictEqual(formatted.metadata.amount, 3500);
    assert.strictEqual(formatted.isRead, false);
    assert(!formatted.secret);
  });

  // 7. Service: registerDevice and removeDevice
  await asyncTest('7. registerDevice and removeDevice manage active push device records', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const origRegister = notificationRepository.registerDeviceToken;
    const origDeactivate = notificationRepository.deactivateDeviceToken;

    let registeredPayload = null;
    notificationRepository.registerDeviceToken = async (data) => {
      registeredPayload = data;
      return { ...data, _id: new mongoose.Types.ObjectId() };
    };

    let deactivatedDeviceId = null;
    notificationRepository.deactivateDeviceToken = async (uId, dId) => {
      deactivatedDeviceId = dId;
      return { userId: uId, deviceId: dId, isActive: false };
    };

    try {
      // 1. Register device
      const regRes = await notificationService.registerDevice(userId, {
        token: 'fcm_test_token_123',
        platform: 'ANDROID',
        deviceId: 'device-abc-456',
        appVersion: '1.2.0',
      });
      assert(regRes.success);
      assert.strictEqual(registeredPayload.token, 'fcm_test_token_123');
      assert.strictEqual(registeredPayload.deviceId, 'device-abc-456');

      // 2. Remove device
      const remRes = await notificationService.removeDevice(userId, 'device-abc-456');
      assert(remRes.success);
      assert.strictEqual(deactivatedDeviceId, 'device-abc-456');
    } finally {
      notificationRepository.registerDeviceToken = origRegister;
      notificationRepository.deactivateDeviceToken = origDeactivate;
    }
  });

  // 8. Service: createNotification creates in-app notification and attempts push
  await asyncTest('8. createNotification persists in-app notification in MongoDB and triggers push provider', async () => {
    const userId = new mongoose.Types.ObjectId();
    const origCreate = notificationRepository.createNotification;
    const origFindDevices = notificationRepository.findUserActiveDevices;
    const origSendPush = notificationProvider.sendToUserDevices;

    let createdDoc = null;
    notificationRepository.createNotification = async (data) => {
      createdDoc = {
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return createdDoc;
    };

    notificationRepository.findUserActiveDevices = async () => [
      { token: 'token_1' },
      { token: 'token_2' },
    ];

    let pushPayloadSent = null;
    notificationProvider.sendToUserDevices = async (payload) => {
      pushPayloadSent = payload;
      return { successfulCount: 2, failedCount: 0, invalidTokens: [] };
    };

    try {
      const result = await notificationService.createNotification({
        userId,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        category: NOTIFICATION_CATEGORIES.BOOKING,
        title: 'Booking Created',
        message: 'Your booking has been created.',
        entityType: 'BOOKING',
        entityId: new mongoose.Types.ObjectId(),
        channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
      });

      assert.strictEqual(result.title, 'Booking Created');
      assert.strictEqual(result.type, NOTIFICATION_TYPES.BOOKING_CREATED);
      assert.strictEqual(pushPayloadSent.tokens.length, 2);
      assert.strictEqual(pushPayloadSent.body, 'Your booking has been created.');
    } finally {
      notificationRepository.createNotification = origCreate;
      notificationRepository.findUserActiveDevices = origFindDevices;
      notificationProvider.sendToUserDevices = origSendPush;
    }
  });

  // 9. Service: Push delivery failure does not delete in-app notification
  await asyncTest('9. Push delivery failure isolates error and preserves in-app notification', async () => {
    const userId = new mongoose.Types.ObjectId();
    const origCreate = notificationRepository.createNotification;
    const origFindDevices = notificationRepository.findUserActiveDevices;
    const origSendPush = notificationProvider.sendToUserDevices;

    let notificationInstance = null;
    notificationRepository.createNotification = async (data) => {
      notificationInstance = {
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async () => {},
      };
      return notificationInstance;
    };

    notificationRepository.findUserActiveDevices = async () => [{ token: 'bad_token' }];

    notificationProvider.sendToUserDevices = async () => {
      throw new Error('FCM Connection Timeout');
    };

    try {
      const result = await notificationService.createNotification({
        userId,
        type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
        category: NOTIFICATION_CATEGORIES.PAYMENT,
        title: 'Payment Successful',
        message: 'Payment received.',
        channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.PUSH],
      });

      // Notification still exists and was returned cleanly
      assert.strictEqual(result.title, 'Payment Successful');
      assert.strictEqual(notificationInstance.deliveryStatus, DELIVERY_STATUS.FAILED);
      assert.strictEqual(notificationInstance.deliveryError, 'FCM Connection Timeout');
    } finally {
      notificationRepository.createNotification = origCreate;
      notificationRepository.findUserActiveDevices = origFindDevices;
      notificationProvider.sendToUserDevices = origSendPush;
    }
  });

  // 10. Service: Event helper methods
  await asyncTest('10. Event helper methods generate correct payload types', async () => {
    const userId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();
    const origCreate = notificationService.createNotification;

    let createdEvents = [];
    notificationService.createNotification = async (payload) => {
      createdEvents.push(payload);
      return { ...payload, id: new mongoose.Types.ObjectId().toString() };
    };

    try {
      await notificationService.notifyBookingCreated({
        userId,
        bookingId,
        bookingReference: 'BK-20260926-0001',
      });

      await notificationService.notifyInspectionCompleted({
        customerUserId: userId,
        bookingId,
        inspectionId: new mongoose.Types.ObjectId(),
        bookingReference: 'BK-20260926-0001',
      });

      await notificationService.notifyQuotationSubmitted({
        customerUserId: userId,
        bookingId,
        quotationId: new mongoose.Types.ObjectId(),
        quotationReference: 'QT-20260926-0001',
        totalAmount: 4500,
      });

      await notificationService.notifyPaymentSuccess({
        customerUserId: userId,
        bookingId,
        paymentId: new mongoose.Types.ObjectId(),
        paymentReference: 'PAY-20260926-0001',
        amount: 4500,
      });

      await notificationService.notifyInvoiceGenerated({
        customerUserId: userId,
        bookingId,
        invoiceId: new mongoose.Types.ObjectId(),
        invoiceNumber: 'INV-20260926-0001',
        totalAmount: 4500,
      });

      assert.strictEqual(createdEvents.length, 5);
      assert.strictEqual(createdEvents[0].type, NOTIFICATION_TYPES.BOOKING_CREATED);
      assert.strictEqual(createdEvents[1].type, NOTIFICATION_TYPES.INSPECTION_COMPLETED);
      assert.strictEqual(createdEvents[2].type, NOTIFICATION_TYPES.QUOTATION_SUBMITTED);
      assert.strictEqual(createdEvents[3].type, NOTIFICATION_TYPES.PAYMENT_SUCCESS);
      assert.strictEqual(createdEvents[4].type, NOTIFICATION_TYPES.INVOICE_GENERATED);
    } finally {
      notificationService.createNotification = origCreate;
    }
  });

  // 11. Service: User queries and isolation
  await asyncTest('11. getUserNotifications and getNotificationById enforce customer isolation', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    const notificationId = new mongoose.Types.ObjectId().toString();

    const origFindById = notificationRepository.findNotificationById;
    const origFindUser = notificationRepository.findNotificationsByUser;
    const origCount = notificationRepository.countNotificationsByUser;

    notificationRepository.findNotificationById = async () => ({
      _id: notificationId,
      userId: ownerId,
      title: 'Your Vehicle is Ready',
      message: 'Service completed.',
      type: NOTIFICATION_TYPES.SYSTEM_ALERT,
      category: NOTIFICATION_CATEGORIES.SYSTEM,
      isRead: false,
    });

    notificationRepository.findNotificationsByUser = async ({ userId }) => [
      {
        _id: notificationId,
        userId,
        title: 'Your Vehicle is Ready',
        message: 'Service completed.',
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        category: NOTIFICATION_CATEGORIES.SYSTEM,
        isRead: false,
      },
    ];
    notificationRepository.countNotificationsByUser = async () => 1;

    try {
      // 1. Owner can access single
      const res = await notificationService.getNotificationById(notificationId, ownerId.toString());
      assert.strictEqual(res.id, notificationId);

      // 2. Other user is rejected with 403
      try {
        await notificationService.getNotificationById(notificationId, otherUserId.toString());
        assert.fail('Should have thrown 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }

      // 3. User listings
      const listRes = await notificationService.getUserNotifications({ userId: ownerId.toString() });
      assert.strictEqual(listRes.notifications.length, 1);
      assert.strictEqual(listRes.pagination.total, 1);
    } finally {
      notificationRepository.findNotificationById = origFindById;
      notificationRepository.findNotificationsByUser = origFindUser;
      notificationRepository.countNotificationsByUser = origCount;
    }
  });

  // 12. Service: markAsRead and markAllAsRead
  await asyncTest('12. markAsRead and markAllAsRead update read state', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const notificationId = new mongoose.Types.ObjectId().toString();

    const origFindById = notificationRepository.findNotificationById;
    const origMarkRead = notificationRepository.markAsRead;
    const origMarkAllRead = notificationRepository.markAllAsRead;
    const origCountUnread = notificationRepository.countUnread;

    notificationRepository.findNotificationById = async () => ({
      _id: notificationId,
      userId,
      isRead: false,
      title: 'Alert',
      message: 'Test',
      type: 'SYSTEM_ALERT',
      category: 'SYSTEM',
    });

    notificationRepository.markAsRead = async (id, uId, date) => ({
      _id: id,
      userId: uId,
      isRead: true,
      readAt: date,
      title: 'Alert',
      message: 'Test',
      type: 'SYSTEM_ALERT',
      category: 'SYSTEM',
    });

    notificationRepository.markAllAsRead = async () => ({ modifiedCount: 4 });
    notificationRepository.countUnread = async () => 0;

    try {
      // 1. Mark single as read
      const readRes = await notificationService.markAsRead(notificationId, userId);
      assert.strictEqual(readRes.isRead, true);

      // 2. Mark all as read
      const allReadRes = await notificationService.markAllAsRead(userId);
      assert.strictEqual(allReadRes.modifiedCount, 4);

      // 3. Unread count
      const unreadCountRes = await notificationService.getUnreadCount(userId);
      assert.strictEqual(unreadCountRes.count, 0);
    } finally {
      notificationRepository.findNotificationById = origFindById;
      notificationRepository.markAsRead = origMarkRead;
      notificationRepository.markAllAsRead = origMarkAllRead;
      notificationRepository.countUnread = origCountUnread;
    }
  });

  // 13. Service: Soft deletion
  await asyncTest('13. deleteNotification performs soft deletion on notification', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const notificationId = new mongoose.Types.ObjectId().toString();

    const origFindById = notificationRepository.findNotificationById;
    const origSoftDelete = notificationRepository.softDeleteNotification;

    notificationRepository.findNotificationById = async () => ({
      _id: notificationId,
      userId,
      isRead: true,
      title: 'Notice',
      message: 'To be deleted',
      type: 'SYSTEM_ALERT',
      category: 'SYSTEM',
    });

    let softDeletedId = null;
    notificationRepository.softDeleteNotification = async (id) => {
      softDeletedId = id;
      return {
        _id: id,
        userId,
        isDeleted: true,
        title: 'Notice',
        message: 'Deleted',
        type: 'SYSTEM_ALERT',
        category: 'SYSTEM',
      };
    };

    try {
      const res = await notificationService.deleteNotification(notificationId, userId);
      assert.strictEqual(softDeletedId, notificationId);
      assert.strictEqual(res.id, notificationId);
    } finally {
      notificationRepository.findNotificationById = origFindById;
      notificationRepository.softDeleteNotification = origSoftDelete;
    }
  });

  // 14. Routing: Express router mounts /api/notifications
  test('14. Express router mounts /api/notifications routes correctly', () => {
    const routes = app._router.stack
      .filter((layer) => layer.route || layer.name === 'router')
      .map((layer) => layer.regexp.toString());

    const hasNotificationsRoute = routes.some((r) => r.includes('notifications'));
    assert(hasNotificationsRoute, 'Expected /api/notifications router to be mounted in app.js');
  });

  console.log(`\n--- NOTIFICATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
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
