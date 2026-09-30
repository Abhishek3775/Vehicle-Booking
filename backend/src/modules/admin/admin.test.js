const assert = require('assert');
const mongoose = require('mongoose');
const adminService = require('./admin.service');
const adminRepository = require('./admin.repository');
const Admin = require('./admin.model');
const AdminAuditLog = require('./admin-audit-log.model');
const User = require('../user/user.model');
const Auth = require('../auth/auth.model');
const Mechanic = require('../mechanic/mechanic.model');
const Booking = require('../booking/booking.model');
const Payment = require('../payment/payment.model');
const Invoice = require('../invoice/invoice.model');
const {
  ADMIN_STATUS,
  ADMIN_PERMISSIONS,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} = require('./admin.constants');
const {
  validateIdParam,
  validateUpdateProfile,
  validateUpdateUserStatus,
  validateUpdateMechanicVerification,
  validateCancelBooking,
  validatePaginationQuery,
  validateDashboardFilter,
  validateAuditLogQuery,
} = require('./admin.validation');
const { ROLES } = require('../auth/auth.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { PAYMENT_STATUS } = require('../payment/payment.constants');
const { VERIFICATION_STATUS } = require('../mechanic/mechanic.constants');
const app = require('../../app');

async function runTests() {
  console.log('\n--- STARTING ADMIN MODULE COMPREHENSIVE TEST SUITE ---\n');

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
  test('1. Admin and AdminAuditLog Models are registered with complete schema paths', () => {
    assert(Admin.modelName === 'Admin');
    const aPaths = Admin.schema.paths;
    assert(aPaths['userId'], 'userId missing in Admin');
    assert(aPaths['adminCode'], 'adminCode missing in Admin');
    assert(aPaths['displayName'], 'displayName missing in Admin');
    assert(aPaths['department'], 'department missing in Admin');
    assert(aPaths['permissions'], 'permissions missing in Admin');
    assert(aPaths['status'], 'status missing in Admin');
    assert(aPaths['createdAt'], 'createdAt missing in Admin');

    assert(AdminAuditLog.modelName === 'AdminAuditLog');
    const lPaths = AdminAuditLog.schema.paths;
    assert(lPaths['adminId'], 'adminId missing in AdminAuditLog');
    assert(lPaths['action'], 'action missing in AdminAuditLog');
    assert(lPaths['module'], 'module missing in AdminAuditLog');
    assert(lPaths['entityType'], 'entityType missing in AdminAuditLog');
    assert(lPaths['description'], 'description missing in AdminAuditLog');
    assert(lPaths['metadata'], 'metadata missing in AdminAuditLog');
    assert(lPaths['createdAt'], 'createdAt missing in AdminAuditLog');
  });

  // 2. Constants Verification
  test('2. Admin statuses, permissions, and audit action constants are defined', () => {
    assert.strictEqual(ADMIN_STATUS.ACTIVE, 'ACTIVE');
    assert.strictEqual(ADMIN_PERMISSIONS.USERS_VIEW, 'USERS_VIEW');
    assert.strictEqual(ADMIN_PERMISSIONS.BOOKINGS_MANAGE, 'BOOKINGS_MANAGE');
    assert.strictEqual(AUDIT_ACTIONS.UPDATE_USER_STATUS, 'UPDATE_USER_STATUS');
    assert.strictEqual(AUDIT_ACTIONS.VERIFY_MECHANIC, 'VERIFY_MECHANIC');
    assert.strictEqual(AUDIT_ACTIONS.CANCEL_BOOKING, 'CANCEL_BOOKING');
    assert.strictEqual(AUDIT_MODULES.BOOKING, 'BOOKING');
    assert.strictEqual(AUDIT_MODULES.PAYMENT, 'PAYMENT');
  });

  // 3. Validation: validateIdParam
  test('3. validateIdParam validates 24-character hexadecimal MongoDB ObjectIds', () => {
    const invalidReq = { params: { userId: 'not-a-valid-hex-id' } };
    const res1 = createMockRes();
    validateIdParam('userId')(invalidReq, res1, () => {});
    assert.strictEqual(res1.getStatusCode(), 400);

    const validId = new mongoose.Types.ObjectId().toString();
    const validReq = { params: { userId: validId } };
    let called = false;
    validateIdParam('userId')(validReq, createMockRes(), () => { called = true; });
    assert(called);
  });

  // 4. Validation: validateUpdateProfile
  test('4. validateUpdateProfile rejects forbidden security fields', () => {
    const forbiddenReq = {
      body: {
        password: 'new_password',
        role: 'SUPER_ADMIN',
        userId: new mongoose.Types.ObjectId().toString(),
        displayName: 'John Admin',
      },
    };
    const res = createMockRes();
    validateUpdateProfile(forbiddenReq, res, () => {});
    assert.strictEqual(res.getStatusCode(), 400);
    assert(res.getData().error.fields.password);
    assert(res.getData().error.fields.role);

    const validReq = { body: { displayName: 'Operations Lead', department: 'Fleet' } };
    let called = false;
    validateUpdateProfile(validReq, createMockRes(), () => { called = true; });
    assert(called);
    assert.strictEqual(validReq.body.displayName, 'Operations Lead');
  });

  // 5. Validation: validateUpdateUserStatus & validateUpdateMechanicVerification
  test('5. Status and verification validation middlewares enforce allowed enums', () => {
    const invalidStatusReq = { body: { status: 'SUPER_BLOCKED' } };
    const res1 = createMockRes();
    validateUpdateUserStatus(invalidStatusReq, res1, () => {});
    assert.strictEqual(res1.getStatusCode(), 400);

    const validStatusReq = { body: { status: 'BLOCKED', reason: 'Violation of safety policy' } };
    let called1 = false;
    validateUpdateUserStatus(validStatusReq, createMockRes(), () => { called1 = true; });
    assert(called1);
    assert.strictEqual(validStatusReq.body.status, 'BLOCKED');

    const invalidMechReq = { body: { verificationStatus: 'AUTO_APPROVED' } };
    const res2 = createMockRes();
    validateUpdateMechanicVerification(invalidMechReq, res2, () => {});
    assert.strictEqual(res2.getStatusCode(), 400);

    const validMechReq = { body: { verificationStatus: 'VERIFIED', reason: 'Documents verified' } };
    let called2 = false;
    validateUpdateMechanicVerification(validMechReq, createMockRes(), () => { called2 = true; });
    assert(called2);
    assert.strictEqual(validMechReq.body.verificationStatus, 'VERIFIED');
  });

  // 6. Service: Admin Profile management
  await asyncTest('6. getAdminProfile and updateAdminProfile retrieve and update profile with audit logging', async () => {
    const adminUserId = new mongoose.Types.ObjectId().toString();

    const origFindUser = User.findOne;
    const origFindAuth = Auth.findOne;
    const origFindAdmin = adminRepository.findAdminByUserId;
    const origCreateAdmin = adminRepository.createAdmin;
    const origUpdateAdmin = adminRepository.updateAdminProfile;
    const origCreateAudit = adminRepository.createAuditLog;

    User.findOne = () => ({
      exec: async () => ({ firstName: 'Admin', lastName: 'Master', email: 'admin@vehicle.com' }),
    });
    Auth.findOne = () => ({
      exec: async () => ({ phone: '+919999900000', email: 'admin@vehicle.com', lastLoginAt: new Date() }),
    });
    adminRepository.findAdminByUserId = async () => null;

    let createdAdminDoc = null;
    adminRepository.createAdmin = async (doc) => {
      createdAdminDoc = {
        ...doc,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return createdAdminDoc;
    };

    let auditLogCreated = null;
    adminRepository.createAuditLog = async (log) => {
      auditLogCreated = log;
      return log;
    };

    adminRepository.updateAdminProfile = async (uId, update) => {
      createdAdminDoc = { ...createdAdminDoc, ...update };
      return createdAdminDoc;
    };

    try {
      // 1. Initial retrieval auto-initializes profile
      const profile = await adminService.getAdminProfile(adminUserId);
      assert.strictEqual(profile.userId, adminUserId);
      assert(profile.adminCode.startsWith('ADM-'));
      assert.strictEqual(profile.email, 'admin@vehicle.com');

      // 2. Update profile
      adminRepository.findAdminByUserId = async () => createdAdminDoc;
      const updated = await adminService.updateAdminProfile(adminUserId, {
        displayName: 'Chief Operations Officer',
        department: 'Executive Management',
      });

      assert.strictEqual(updated.displayName, 'Chief Operations Officer');
      assert.strictEqual(updated.department, 'Executive Management');
      assert.strictEqual(auditLogCreated.action, AUDIT_ACTIONS.UPDATE_PROFILE);
    } finally {
      User.findOne = origFindUser;
      Auth.findOne = origFindAuth;
      adminRepository.findAdminByUserId = origFindAdmin;
      adminRepository.createAdmin = origCreateAdmin;
      adminRepository.updateAdminProfile = origUpdateAdmin;
      adminRepository.createAuditLog = origCreateAudit;
    }
  });

  // 7. Service: Dashboard Summary & Revenue aggregation
  await asyncTest('7. getDashboardSummary and getRevenueAnalytics aggregate metrics using SUCCESS payments', async () => {
    const origGetCounts = adminRepository.getDashboardCounts;
    const origGetRevenue = adminRepository.getRevenueStats;
    const origGetBookingAnalytics = adminRepository.getBookingAnalytics;

    adminRepository.getDashboardCounts = async () => ({
      users: { total: 120, active: 115, blocked: 5 },
      mechanics: { total: 30, verified: 25, available: 10, onJob: 5 },
      bookings: { total: 450, pending: 12, active: 8, completed: 410, cancelled: 20 },
      payments: { total: 420, successful: 410, failed: 10 },
      invoices: { total: 410, issued: 410 },
    });

    adminRepository.getRevenueStats = async () => ({
      totalRevenue: 525000,
      transactionCount: 410,
    });

    adminRepository.getBookingAnalytics = async () => [
      { date: '2026-09-25', total: 25, completed: 22, cancelled: 3 },
      { date: '2026-09-26', total: 30, completed: 28, cancelled: 1 },
    ];

    try {
      const summary = await adminService.getDashboardSummary();
      assert.strictEqual(summary.users.total, 120);
      assert.strictEqual(summary.bookings.completed, 410);
      assert.strictEqual(summary.revenue.total, 525000);
      assert.strictEqual(summary.revenue.currency, 'INR');

      const revAnalytics = await adminService.getRevenueAnalytics({
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      });
      assert.strictEqual(revAnalytics.totalRevenue, 525000);

      const bookingAnalytics = await adminService.getBookingAnalytics({ startDate: '2026-09-25' });
      assert.strictEqual(bookingAnalytics.length, 2);
      assert.strictEqual(bookingAnalytics[0].completed, 22);
    } finally {
      adminRepository.getDashboardCounts = origGetCounts;
      adminRepository.getRevenueStats = origGetRevenue;
      adminRepository.getBookingAnalytics = origGetBookingAnalytics;
    }
  });

  // 8. Service: User Management & Status Update
  await asyncTest('8. updateUserStatus updates user account and records audit trail', async () => {
    const targetUserId = new mongoose.Types.ObjectId().toString();
    const adminId = new mongoose.Types.ObjectId().toString();

    const origFindOneUser = User.findOneAndUpdate;
    const origFindOneAuth = Auth.findOneAndUpdate;
    const origCreateAudit = adminRepository.createAuditLog;

    let auditLogged = null;
    adminRepository.createAuditLog = async (log) => {
      auditLogged = log;
      return log;
    };

    User.findOneAndUpdate = () => ({
      exec: async () => ({ userId: targetUserId, accountStatus: 'BLOCKED' }),
    });
    Auth.findOneAndUpdate = () => ({
      exec: async () => ({ userId: targetUserId, accountStatus: 'BLOCKED' }),
    });

    try {
      const result = await adminService.updateUserStatus(
        targetUserId,
        { status: 'BLOCKED', reason: 'Suspicious account activities' },
        adminId
      );

      assert.strictEqual(result.accountStatus, 'BLOCKED');
      assert.strictEqual(auditLogged.action, AUDIT_ACTIONS.UPDATE_USER_STATUS);
      assert.strictEqual(auditLogged.entityId, targetUserId);
      assert(auditLogged.description.includes('BLOCKED'));
    } finally {
      User.findOneAndUpdate = origFindOneUser;
      Auth.findOneAndUpdate = origFindOneAuth;
      adminRepository.createAuditLog = origCreateAudit;
    }
  });

  // 9. Service: Booking Cancellation by Admin
  await asyncTest('9. cancelBooking cancels booking as Admin and records audit trail', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const adminId = new mongoose.Types.ObjectId().toString();

    const origFindBooking = Booking.findById;
    const origUpdateBooking = Booking.findByIdAndUpdate;
    const origCreateAudit = adminRepository.createAuditLog;

    Booking.findById = () => ({
      exec: async () => ({
        _id: bookingId,
        bookingReference: 'BK-20260926-0099',
        status: BOOKING_STATUS.PENDING,
      }),
    });

    Booking.findByIdAndUpdate = () => ({
      exec: async () => ({
        _id: bookingId,
        bookingReference: 'BK-20260926-0099',
        status: BOOKING_STATUS.CANCELLED,
        cancellationReason: 'Emergency customer request via support call',
      }),
    });

    let auditLogged = null;
    adminRepository.createAuditLog = async (log) => {
      auditLogged = log;
      return log;
    };

    try {
      const result = await adminService.cancelBooking(
        bookingId,
        { cancellationReason: 'Emergency customer request via support call' },
        adminId
      );

      assert.strictEqual(result.status, BOOKING_STATUS.CANCELLED);
      assert.strictEqual(auditLogged.action, AUDIT_ACTIONS.CANCEL_BOOKING);
      assert.strictEqual(auditLogged.entityId, bookingId);
      assert(auditLogged.description.includes('BK-20260926-0099'));
    } finally {
      Booking.findById = origFindBooking;
      Booking.findByIdAndUpdate = origUpdateBooking;
      adminRepository.createAuditLog = origCreateAudit;
    }
  });

  // 10. Service: Global Search
  await asyncTest('10. globalSearch performs fast categorized searches across collections', async () => {
    const origUserFind = User.find;
    const origBookingFind = Booking.find;
    const origMechFind = Mechanic.find;
    const origInvFind = Invoice.find;

    User.find = () => ({
      limit: () => ({
        exec: async () => [{ _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(), firstName: 'Robert', lastName: 'Paulson', email: 'bob@test.com' }],
      }),
    });

    Booking.find = () => ({
      limit: () => ({
        exec: async () => [{ _id: new mongoose.Types.ObjectId(), bookingReference: 'BK-20260926-0042', status: 'PENDING' }],
      }),
    });

    Mechanic.find = () => ({
      limit: () => ({
        exec: async () => [{ _id: new mongoose.Types.ObjectId(), displayName: 'Bob Mechanic', mechanicCode: 'MECH-20260926-0001' }],
      }),
    });

    Invoice.find = () => ({
      limit: () => ({
        exec: async () => [{ _id: new mongoose.Types.ObjectId(), invoiceNumber: 'INV-20260926-0042', totalAmount: 4500 }],
      }),
    });

    try {
      const results = await adminService.globalSearch('Bob');
      assert.strictEqual(results.users.length, 1);
      assert.strictEqual(results.bookings.length, 1);
      assert.strictEqual(results.mechanics.length, 1);
      assert.strictEqual(results.invoices.length, 1);
    } finally {
      User.find = origUserFind;
      Booking.find = origBookingFind;
      Mechanic.find = origMechFind;
      Invoice.find = origInvFind;
    }
  });

  // 11. Service: Mechanic Dashboard Analytics
  await asyncTest('11. getMechanicsAnalytics returns complete mechanic fleet counts', async () => {
    const origGetStats = adminRepository.getMechanicStats;
    adminRepository.getMechanicStats = async () => ({
      total: 50,
      available: 20,
      unavailable: 15,
      onJob: 15,
      verified: 45,
      pendingVerification: 5,
    });

    try {
      const stats = await adminService.getMechanicsAnalytics();
      assert.strictEqual(stats.total, 50);
      assert.strictEqual(stats.available, 20);
      assert.strictEqual(stats.onJob, 15);
      assert.strictEqual(stats.verified, 45);
      assert.strictEqual(stats.pendingVerification, 5);
    } finally {
      adminRepository.getMechanicStats = origGetStats;
    }
  });

  // 12. Router Mounting: Express app router mounts /api/admin
  test('12. Express router mounts /api/admin routes correctly', () => {
    const routes = app._router.stack
      .filter((layer) => layer.route || layer.name === 'router')
      .map((layer) => layer.regexp.toString());

    const hasAdminRoute = routes.some((r) => r.includes('admin'));
    assert(hasAdminRoute, 'Expected /api/admin router to be mounted in app.js');
  });

  console.log(`\n--- ADMIN TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
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
