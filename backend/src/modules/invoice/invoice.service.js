const crypto = require('crypto');
const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const invoiceRepository = require('./invoice.repository');
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
  ALLOWED_INVOICE_STATUS_TRANSITIONS,
  PAGINATION_LIMITS,
} = require('./invoice.constants');
const { PAYMENT_STATUS } = require('../payment/payment.constants');
const { QUOTATION_STATUS } = require('../quotation/quotation.constants');
const { ROLES } = require('../auth/auth.constants');

/**
 * Invoice Service Layer
 *
 * Implements business logic for issuing immutable billing documents:
 * - Strict payment settlement verification (Payment status === SUCCESS)
 * - Approved quotation verification (Quotation status === APPROVED)
 * - Permanent point-in-time snapshots for Customer, Vehicle, Payment, and Quotation Line Items
 * - Absolute mathematical financial integrity derived strictly from Quotation and Payment
 * - Robust duplicate prevention and idempotent invoice retrieval for settled payments
 * - Customer data isolation and Admin management boundaries
 */
class InvoiceService {
  /**
   * Format Invoice Mongoose document into standardized API response structure
   * @param {import('./invoice.model')} invoice
   * @returns {object}
   */
  formatInvoiceResponse(invoice) {
    return {
      id: invoice._id ? invoice._id.toString() : invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceReference: invoice.invoiceReference,
      bookingId: invoice.bookingId
        ? invoice.bookingId._id
          ? invoice.bookingId._id.toString()
          : invoice.bookingId.toString()
        : null,
      quotationId: invoice.quotationId
        ? invoice.quotationId._id
          ? invoice.quotationId._id.toString()
          : invoice.quotationId.toString()
        : null,
      paymentId: invoice.paymentId
        ? invoice.paymentId._id
          ? invoice.paymentId._id.toString()
          : invoice.paymentId.toString()
        : null,
      userId: invoice.userId
        ? invoice.userId._id
          ? invoice.userId._id.toString()
          : invoice.userId.toString()
        : null,
      vehicleId: invoice.vehicleId
        ? invoice.vehicleId._id
          ? invoice.vehicleId._id.toString()
          : invoice.vehicleId.toString()
        : null,
      customerSnapshot: invoice.customerSnapshot || {},
      vehicleSnapshot: invoice.vehicleSnapshot || {},
      paymentSnapshot: invoice.paymentSnapshot || {},
      items: (invoice.items || []).map((it) => ({
        id: it._id ? it._id.toString() : it.id,
        itemType: it.itemType,
        serviceId: it.serviceId ? it.serviceId.toString() : null,
        partId: it.partId ? it.partId.toString() : null,
        name: it.name,
        description: it.description || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount || 0,
        taxRate: it.taxRate || 0,
        taxAmount: it.taxAmount || 0,
        total: it.total,
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount || { type: 'FIXED', value: 0, amount: 0 },
      tax: invoice.tax || { rate: 0, amount: 0 },
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue || 0,
      currency: invoice.currency || CURRENCIES.INR,
      paymentStatus: invoice.paymentStatus,
      invoiceStatus: invoice.invoiceStatus,
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      cancelledAt: invoice.cancelledAt || null,
      cancelledBy: invoice.cancelledBy ? invoice.cancelledBy.toString() : null,
      cancellationReason: invoice.cancellationReason || null,
      notes: invoice.notes || '',
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='invoice']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'invoice') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Generate unique customer-facing invoice number
   * Format: INV-YYYYMMDD-XXXX (e.g. INV-20260926-0042)
   * @returns {Promise<string>}
   */
  async generateInvoiceNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const existing = await invoiceRepository.findByNumber(invoiceNumber);
        if (!existing) {
          return invoiceNumber;
        }
      } else {
        return invoiceNumber;
      }
    }

    return `INV-${dateStr}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Generate unique internal invoice reference
   * Format: INVREF-XXXXXX (e.g. INVREF-8F92K1)
   * @returns {Promise<string>}
   */
  async generateInvoiceReference() {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const invoiceReference = `INVREF-${randomHex}`;

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const existing = await invoiceRepository.findByReference(invoiceReference);
      if (!existing) {
        return invoiceReference;
      }
    }

    return `INVREF-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  /**
   * Generate a permanent historical invoice from a successful payment (System / Admin / Customer flow)
   * @param {object} payload
   * @param {string} payload.paymentId
   * @param {string} [payload.notes]
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async generateInvoice({ paymentId, notes = '' }, requestingUser) {
    this.assertValidObjectId(paymentId, 'payment');

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    // 1. Check if invoice already exists for this payment (Idempotency / Duplicate protection)
    const existingInvoice = await invoiceRepository.findByPaymentId(paymentId);
    if (existingInvoice) {
      // If customer requested, ensure ownership
      if (!isAdmin && existingInvoice.userId.toString() !== requestingUserId.toString()) {
        throw new AppError('Access denied: You are not authorized to view this invoice.', 403);
      }
      return this.formatInvoiceResponse(existingInvoice);
    }

    // 2. Fetch Payment document
    const payment = await Payment.findById(paymentId).exec();
    if (!payment) {
      throw new AppError('Payment record not found.', 404);
    }

    // 3. Ownership validation: Customer or Admin
    if (!isAdmin && payment.userId.toString() !== requestingUserId.toString()) {
      throw new AppError('Access denied: You can only generate invoices for your own payments.', 403);
    }

    // 4. Verify Payment status is SUCCESS
    if (payment.status !== PAYMENT_STATUS.SUCCESS) {
      throw new AppError(
        `Cannot generate invoice for payment in '${payment.status}' status. Payment must be SUCCESS.`,
        400
      );
    }

    // 5. Fetch associated Quotation
    const quotation = await Quotation.findById(payment.quotationId).exec();
    if (!quotation) {
      throw new AppError('Associated quotation record not found.', 404);
    }

    // 6. Verify Quotation is APPROVED
    if (quotation.status !== QUOTATION_STATUS.APPROVED) {
      throw new AppError(
        `Cannot generate invoice for quotation in '${quotation.status}' status. Quotation must be APPROVED.`,
        400
      );
    }

    // 7. Verify financial alignment between Quotation and Payment
    if (payment.amount !== quotation.totalAmount) {
      throw new AppError(
        `Financial mismatch: Payment amount (${payment.amount}) does not match approved quotation total (${quotation.totalAmount}).`,
        400
      );
    }

    // 8. Fetch associated Booking
    const booking = await Booking.findById(payment.bookingId).exec();
    if (!booking) {
      throw new AppError('Associated booking record not found.', 404);
    }

    // 9. Construct Customer Snapshot (Immutable point-in-time)
    const [userDoc, authDoc] = await Promise.all([
      User.findOne({ userId: payment.userId }).exec(),
      Auth.findOne({ userId: payment.userId }).exec(),
    ]);

    let customerName = '';
    if (userDoc) {
      customerName = `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim();
    }
    const customerEmail = userDoc?.email || authDoc?.email || null;
    const customerPhone = authDoc?.phone || '';

    let billingAddress = booking.addressSnapshot || {};
    if (Object.keys(billingAddress).length === 0) {
      const defaultAddress = await Address.findOne({ userId: payment.userId, isDefault: true }).exec();
      if (defaultAddress) {
        billingAddress = {
          fullName: defaultAddress.fullName,
          phone: defaultAddress.phone,
          addressLine1: defaultAddress.addressLine1,
          addressLine2: defaultAddress.addressLine2 || '',
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postalCode,
          country: defaultAddress.country || 'India',
        };
      }
    }

    const customerSnapshot = {
      userId: payment.userId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      billingAddress,
    };

    // 10. Construct Vehicle Snapshot (Immutable point-in-time)
    let vehicleSnapshot = booking.vehicleSnapshot || null;
    if (!vehicleSnapshot && quotation.vehicleId) {
      const vehicleDoc = await Vehicle.findById(quotation.vehicleId).exec();
      if (vehicleDoc) {
        vehicleSnapshot = {
          vehicleId: vehicleDoc._id,
          vehicleType: vehicleDoc.vehicleType,
          make: vehicleDoc.make,
          model: vehicleDoc.model,
          variant: vehicleDoc.variant || '',
          registrationNumber: vehicleDoc.registrationNumber,
          fuelType: vehicleDoc.fuelType,
        };
      }
    }
    if (!vehicleSnapshot) {
      vehicleSnapshot = {
        vehicleId: quotation.vehicleId,
        vehicleType: '',
        make: '',
        model: '',
        variant: '',
        registrationNumber: '',
        fuelType: '',
      };
    }

    // 11. Construct Payment Snapshot
    const paymentSnapshot = {
      paymentId: payment._id,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
      gatewayPaymentId: payment.gatewayPaymentId,
      paidAt: payment.paidAt,
      amountPaid: payment.amount,
      currency: payment.currency || CURRENCIES.INR,
    };

    // 12. Snapshot Quotation Line Items
    const itemsSnapshot = (quotation.items || []).map((it) => ({
      itemType: it.itemType,
      serviceId: it.serviceId ? (it.serviceId._id ? it.serviceId._id : it.serviceId) : null,
      partId: it.partId ? (it.partId._id ? it.partId._id : it.partId) : null,
      name: it.name,
      description: it.description || '',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount || 0,
      taxRate: it.taxRate || 0,
      taxAmount: it.taxAmount || 0,
      total: it.total,
    }));

    // 13. Generate unique numbers
    const invoiceNumber = await this.generateInvoiceNumber();
    const invoiceReference = await this.generateInvoiceReference();

    // 14. Construct complete Invoice document
    const invoiceData = {
      invoiceNumber,
      invoiceReference,
      bookingId: payment.bookingId,
      quotationId: payment.quotationId,
      paymentId: payment._id,
      userId: payment.userId,
      vehicleId: quotation.vehicleId,
      customerSnapshot,
      vehicleSnapshot,
      paymentSnapshot,
      items: itemsSnapshot,
      subtotal: quotation.subtotal,
      discount: quotation.discount || { type: 'FIXED', value: 0, amount: 0 },
      tax: quotation.tax || { rate: 0, amount: 0 },
      totalAmount: quotation.totalAmount,
      amountPaid: payment.amount,
      amountDue: 0,
      currency: quotation.currency || CURRENCIES.INR,
      paymentStatus: INVOICE_PAYMENT_STATUS.PAID,
      invoiceStatus: INVOICE_STATUS.ISSUED,
      issuedAt: new Date(),
      dueAt: new Date(),
      notes: notes ? notes.trim() : '',
    };

    const newInvoice = await invoiceRepository.create(invoiceData);
    return this.formatInvoiceResponse(newInvoice);
  }

  /**
   * Retrieve single invoice by ID (Customer owner or Admin)
   * @param {string} invoiceId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getInvoiceById(invoiceId, requestingUser) {
    this.assertValidObjectId(invoiceId, 'invoice');

    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isOwner = invoice.userId && invoice.userId.toString() === requestingUserId.toString();

    if (!isAdmin && !isOwner) {
      throw new AppError('Access denied: You are not authorized to view this invoice.', 403);
    }

    return this.formatInvoiceResponse(invoice);
  }

  /**
   * Retrieve invoice history for a booking (Customer owner or Admin)
   * @param {string} bookingId
   * @param {object} requestingUser
   * @returns {Promise<Array<object>>}
   */
  async getInvoicesByBookingId(bookingId, requestingUser) {
    this.assertValidObjectId(bookingId, 'booking');

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isOwner = booking.userId && booking.userId.toString() === requestingUserId.toString();

    if (!isAdmin && !isOwner) {
      throw new AppError('Access denied: You are not authorized to view invoices for this booking.', 403);
    }

    const invoices = await invoiceRepository.findByBookingId(bookingId);
    return invoices.map((inv) => this.formatInvoiceResponse(inv));
  }

  /**
   * Query list of invoices with role-based filters and pagination
   * @param {object} params
   * @param {object} [params.query={}]
   * @param {object} params.requestingUser
   * @returns {Promise<{ invoices: Array<object>, pagination: object }>}
   */
  async getInvoicesList({ query = {} }, requestingUser) {
    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    const page = Math.max(parseInt(query.page, 10) || PAGINATION_LIMITS.DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit, 10) || PAGINATION_LIMITS.DEFAULT_LIMIT, 1),
      PAGINATION_LIMITS.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const filter = {};

    // Customer is strictly scoped to own user ID
    if (!isAdmin) {
      filter.userId = new mongoose.Types.ObjectId(requestingUserId);
    } else if (query.userId && mongoose.Types.ObjectId.isValid(query.userId.trim())) {
      filter.userId = new mongoose.Types.ObjectId(query.userId.trim());
    }

    // Filter by bookingId
    if (query.bookingId && mongoose.Types.ObjectId.isValid(query.bookingId.trim())) {
      filter.bookingId = new mongoose.Types.ObjectId(query.bookingId.trim());
    }

    // Filter by invoiceStatus
    if (query.invoiceStatus) {
      const normStatus = query.invoiceStatus.toUpperCase().trim();
      if (Object.values(INVOICE_STATUS).includes(normStatus)) {
        filter.invoiceStatus = normStatus;
      }
    }

    // Filter by paymentStatus
    if (query.paymentStatus) {
      const normPayStatus = query.paymentStatus.toUpperCase().trim();
      if (Object.values(INVOICE_PAYMENT_STATUS).includes(normPayStatus)) {
        filter.paymentStatus = normPayStatus;
      }
    }

    // Date range filter
    if (query.fromIssuedAt || query.toIssuedAt) {
      filter.issuedAt = {};
      if (query.fromIssuedAt) {
        const fromDate = new Date(query.fromIssuedAt);
        if (!isNaN(fromDate.getTime())) {
          filter.issuedAt.$gte = fromDate;
        }
      }
      if (query.toIssuedAt) {
        const toDate = new Date(query.toIssuedAt);
        if (!isNaN(toDate.getTime())) {
          filter.issuedAt.$lte = toDate;
        }
      }
      if (Object.keys(filter.issuedAt).length === 0) {
        delete filter.issuedAt;
      }
    }

    const sort = { issuedAt: -1 };

    const [invoices, total] = await Promise.all([
      invoiceRepository.findInvoices({ filter, sort, skip, limit }),
      invoiceRepository.countInvoices(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      invoices: invoices.map((inv) => this.formatInvoiceResponse(inv)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Cancel an issued invoice (Admin only)
   * @param {string} invoiceId
   * @param {object} payload
   * @param {string} payload.cancellationReason
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async cancelInvoice(invoiceId, { cancellationReason }, requestingUser) {
    this.assertValidObjectId(invoiceId, 'invoice');

    if (requestingUser.role !== ROLES.ADMIN) {
      throw new AppError('Access denied: Only administrators can cancel issued invoices.', 403);
    }

    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found.', 404);
    }

    if (invoice.invoiceStatus === INVOICE_STATUS.CANCELLED) {
      throw new AppError('Invoice is already cancelled.', 400);
    }

    const allowedTransitions = ALLOWED_INVOICE_STATUS_TRANSITIONS[invoice.invoiceStatus] || [];
    if (!allowedTransitions.includes(INVOICE_STATUS.CANCELLED)) {
      throw new AppError(`Cannot cancel invoice in '${invoice.invoiceStatus}' status.`, 400);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;

    const cancelled = await invoiceRepository.cancelInvoice(invoiceId, {
      cancelledBy: new mongoose.Types.ObjectId(requestingUserId),
      cancellationReason: cancellationReason.trim(),
      cancelledAt: new Date(),
    });

    return this.formatInvoiceResponse(cancelled);
  }
}

module.exports = new InvoiceService();
