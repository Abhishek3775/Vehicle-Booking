const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const quotationRepository = require('./quotation.repository');
const Inspection = require('../inspection/inspection.model');
const Booking = require('../booking/booking.model');
const Service = require('../service/service.model');
const {
  QUOTATION_STATUS,
  CUSTOMER_RESPONSE,
  ITEM_TYPES,
  DISCOUNT_TYPES,
  CURRENCIES,
  QUOTATION_LIMITS,
} = require('./quotation.constants');
const { INSPECTION_STATUS } = require('../inspection/inspection.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { ROLES } = require('../auth/auth.constants');

/**
 * Quotation Service Layer
 *
 * Implements business logic for managing customer price estimates:
 * - Completed inspection verification before quote creation
 * - Item-level price snapshotting from service catalogue
 * - Reliable server-side financial calculations (subtotal, discount, tax, total)
 * - Unique quotation reference generation (QT-YYYYMMDD-XXXX)
 * - Safe status lifecycle transitions (DRAFT -> PENDING_APPROVAL -> APPROVED/REJECTED/EXPIRED)
 * - Expiration enforcement
 * - Multi-role authorization guards (Customer, Mechanic, Admin)
 * - Booking state synchronization
 */
class QuotationService {
  /**
   * Format Quotation Mongoose document into standardized API response structure
   * @param {import('./quotation.model')} quotation
   * @returns {object}
   */
  formatQuotationResponse(quotation) {
    return {
      id: quotation._id ? quotation._id.toString() : quotation.id,
      quotationReference: quotation.quotationReference,
      bookingId: quotation.bookingId ? (quotation.bookingId._id ? quotation.bookingId._id.toString() : quotation.bookingId.toString()) : null,
      inspectionId: quotation.inspectionId ? (quotation.inspectionId._id ? quotation.inspectionId._id.toString() : quotation.inspectionId.toString()) : null,
      userId: quotation.userId ? (quotation.userId._id ? quotation.userId._id.toString() : quotation.userId.toString()) : null,
      vehicleId: quotation.vehicleId ? (quotation.vehicleId._id ? quotation.vehicleId._id.toString() : quotation.vehicleId.toString()) : null,
      mechanicId: quotation.mechanicId ? (quotation.mechanicId._id ? quotation.mechanicId._id.toString() : quotation.mechanicId.toString()) : null,
      items: (quotation.items || []).map((it) => ({
        id: it._id ? it._id.toString() : it.id,
        itemType: it.itemType,
        serviceId: it.serviceId ? (it.serviceId._id ? it.serviceId._id.toString() : it.serviceId.toString()) : null,
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
      subtotal: quotation.subtotal,
      discount: quotation.discount || { type: DISCOUNT_TYPES.FIXED, value: 0, amount: 0 },
      tax: quotation.tax || { rate: 0, amount: 0 },
      totalAmount: quotation.totalAmount,
      currency: quotation.currency || CURRENCIES.INR,
      status: quotation.status,
      customerResponse: quotation.customerResponse,
      customerResponseAt: quotation.customerResponseAt || null,
      rejectionReason: quotation.rejectionReason || null,
      validUntil: quotation.validUntil,
      version: quotation.version || 1,
      parentQuotationId: quotation.parentQuotationId ? quotation.parentQuotationId.toString() : null,
      notes: quotation.notes || '',
      approvedAt: quotation.approvedAt || null,
      rejectedAt: quotation.rejectedAt || null,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='quotation']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'quotation') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Generate a unique human-readable quotation reference
   * Example: QT-20260926-0042
   * @returns {Promise<string>}
   */
  async generateQuotationReference() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ref = `QT-${dateStr}-${randomSuffix}`;

      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const existing = await quotationRepository.findByReference(ref);
        if (!existing) {
          return ref;
        }
      } else {
        return ref;
      }
    }

    return `QT-${dateStr}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Server-side calculation of quotation financials
   * @param {Array<object>} items
   * @param {object} [discountInput]
   * @param {object} [taxInput]
   * @returns {object}
   */
  calculateFinancials(items, discountInput = {}, taxInput = {}) {
    let subtotal = 0;

    const calculatedItems = items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const itemDisc = Number(item.discount) || 0;
      const lineSubtotal = Math.round(qty * price * 100) / 100;
      const lineTotal = Math.max(0, Math.round((lineSubtotal - itemDisc) * 100) / 100);

      subtotal += lineSubtotal;

      return {
        ...item,
        quantity: qty,
        unitPrice: price,
        discount: itemDisc,
        total: lineTotal,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    // Discount calculation
    let discountAmount = 0;
    const discountType = discountInput.type || DISCOUNT_TYPES.FIXED;
    const discountValue = Number(discountInput.value) || 0;

    if (discountType === DISCOUNT_TYPES.PERCENTAGE) {
      discountAmount = Math.min(subtotal, Math.round((subtotal * discountValue / 100) * 100) / 100);
    } else {
      discountAmount = Math.min(subtotal, Math.max(0, discountValue));
    }

    const taxableAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    // Tax calculation
    const taxRate = Number(taxInput.rate) || 0;
    const taxAmount = Math.round((taxableAmount * taxRate / 100) * 100) / 100;

    // Total Amount
    const totalAmount = Math.max(0, Math.round((taxableAmount + taxAmount) * 100) / 100);

    return {
      subtotal,
      discount: {
        type: discountType,
        value: discountValue,
        amount: discountAmount,
      },
      tax: {
        rate: taxRate,
        amount: taxAmount,
      },
      totalAmount,
      calculatedItems,
    };
  }

  /**
   * Create a new quotation for a completed inspection (Assigned mechanic or Admin)
   * @param {object} payload
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async createQuotation(payload, requestingUser) {
    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    if (!isAdmin && requestingUser.role !== ROLES.MECHANIC) {
      throw new AppError('Access denied: Only mechanics and administrators can create quotations.', 403);
    }

    const { inspectionId } = payload;
    this.assertValidObjectId(inspectionId, 'inspection');

    // 1. Verify inspection existence and completion
    const inspection = await Inspection.findById(inspectionId).exec();
    if (!inspection) {
      throw new AppError('Inspection report not found.', 404);
    }

    if (inspection.status !== INSPECTION_STATUS.COMPLETED) {
      throw new AppError(`Cannot create quotation: Inspection is in '${inspection.status}' status. Inspection must be in COMPLETED status.`, 400);
    }

    // 2. Verify mechanic assignment
    if (!isAdmin && inspection.mechanicId.toString() !== requestingUserId.toString()) {
      throw new AppError('Access denied: You are not the assigned mechanic for this inspection.', 403);
    }

    // 3. Verify booking existence
    const booking = await Booking.findById(inspection.bookingId).exec();
    if (!booking) {
      throw new AppError('Associated booking not found.', 404);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.CLOSED) {
      throw new AppError(`Cannot create quotation for booking in '${booking.status}' status.`, 400);
    }

    // 4. Validate SERVICE catalogue items and snapshot details
    const processedItems = [];
    for (const item of payload.items) {
      if (item.itemType === ITEM_TYPES.SERVICE && item.serviceId) {
        const serviceDoc = await Service.findById(item.serviceId).exec();
        if (!serviceDoc) {
          throw new AppError(`Service with ID '${item.serviceId}' does not exist in the catalogue.`, 400);
        }
        processedItems.push({
          ...item,
          name: item.name || serviceDoc.name,
          description: item.description || serviceDoc.shortDescription || '',
          unitPrice: item.unitPrice !== undefined ? item.unitPrice : serviceDoc.basePrice,
        });
      } else {
        processedItems.push(item);
      }
    }

    // 5. Server-side financial calculations
    const { subtotal, discount, tax, totalAmount, calculatedItems } = this.calculateFinancials(
      processedItems,
      payload.discount,
      payload.tax
    );

    // 6. Check for latest quotation version on booking
    const latestQuote = await quotationRepository.findLatestByBookingId(inspection.bookingId);
    const version = (latestQuote?.version || 0) + 1;
    const parentQuotationId = latestQuote ? latestQuote._id : null;

    // 7. Generate reference and build quotation document
    const quotationReference = await this.generateQuotationReference();

    const quotationData = {
      quotationReference,
      bookingId: inspection.bookingId,
      inspectionId: inspection._id,
      userId: inspection.userId,
      vehicleId: inspection.vehicleId,
      mechanicId: inspection.mechanicId,
      items: calculatedItems,
      subtotal,
      discount,
      tax,
      totalAmount,
      currency: CURRENCIES.INR,
      status: QUOTATION_STATUS.DRAFT,
      customerResponse: CUSTOMER_RESPONSE.PENDING,
      validUntil: payload.validUntil || new Date(Date.now() + QUOTATION_LIMITS.DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
      version,
      parentQuotationId,
      notes: payload.notes ? payload.notes.trim() : '',
      createdBy: new mongoose.Types.ObjectId(requestingUserId),
    };

    const newQuotation = await quotationRepository.create(quotationData);
    return this.formatQuotationResponse(newQuotation);
  }

  /**
   * Submit quotation for customer approval (Assigned mechanic or Admin)
   * @param {string} quotationId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async submitQuotation(quotationId, requestingUser) {
    this.assertValidObjectId(quotationId, 'quotation');

    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) {
      throw new AppError('Quotation not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isAssignedMechanic = quotation.mechanicId && quotation.mechanicId.toString() === requestingUserId.toString();

    if (!isAdmin && !isAssignedMechanic) {
      throw new AppError('Access denied: You are not authorized to submit this quotation.', 403);
    }

    if (quotation.status !== QUOTATION_STATUS.DRAFT) {
      throw new AppError(`Cannot submit quotation in '${quotation.status}' status. Only DRAFT quotations can be submitted.`, 400);
    }

    // Mark as submitted
    const submitted = await quotationRepository.submitQuotation(quotationId);

    // Update booking status to QUOTE_PENDING
    if (quotation.bookingId) {
      await Booking.findByIdAndUpdate(quotation.bookingId, {
        $set: { status: BOOKING_STATUS.QUOTE_PENDING },
      }).exec();
    }

    return this.formatQuotationResponse(submitted);
  }

  /**
   * Customer approves quotation
   * @param {string} quotationId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async approveQuotation(quotationId, requestingUser) {
    this.assertValidObjectId(quotationId, 'quotation');

    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) {
      throw new AppError('Quotation not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isCustomerOwner = quotation.userId && quotation.userId.toString() === requestingUserId.toString();

    if (!isCustomerOwner && requestingUser.role !== ROLES.ADMIN) {
      throw new AppError('Access denied: Only the customer who owns this booking can approve the quotation.', 403);
    }

    // Check expiration
    if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      await quotationRepository.markExpired(quotationId);
      throw new AppError('Cannot approve quotation: Quotation has expired.', 400);
    }

    if (quotation.status === QUOTATION_STATUS.APPROVED) {
      throw new AppError('Quotation is already approved.', 400);
    }

    if (quotation.status === QUOTATION_STATUS.REJECTED) {
      throw new AppError('Cannot approve a rejected quotation. A new quotation must be prepared.', 400);
    }

    if (quotation.status === QUOTATION_STATUS.CANCELLED) {
      throw new AppError('Cannot approve a cancelled quotation.', 400);
    }

    if (quotation.status !== QUOTATION_STATUS.PENDING_APPROVAL) {
      throw new AppError(`Cannot approve quotation in '${quotation.status}' status. Quotation must be submitted for approval first.`, 400);
    }

    const approved = await quotationRepository.approveQuotation(quotationId, new Date());

    // Update booking status to QUOTE_APPROVED
    if (quotation.bookingId) {
      await Booking.findByIdAndUpdate(quotation.bookingId, {
        $set: { status: BOOKING_STATUS.QUOTE_APPROVED },
      }).exec();
    }

    return this.formatQuotationResponse(approved);
  }

  /**
   * Customer rejects quotation with reason
   * @param {string} quotationId
   * @param {object} payload
   * @param {string} payload.reason
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async rejectQuotation(quotationId, { reason }, requestingUser) {
    this.assertValidObjectId(quotationId, 'quotation');

    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) {
      throw new AppError('Quotation not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isCustomerOwner = quotation.userId && quotation.userId.toString() === requestingUserId.toString();

    if (!isCustomerOwner && requestingUser.role !== ROLES.ADMIN) {
      throw new AppError('Access denied: Only the customer who owns this booking can reject the quotation.', 403);
    }

    if (quotation.status === QUOTATION_STATUS.APPROVED) {
      throw new AppError('Cannot reject an already approved quotation.', 400);
    }

    if (quotation.status === QUOTATION_STATUS.REJECTED) {
      throw new AppError('Quotation is already rejected.', 400);
    }

    // Check expiration
    if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      await quotationRepository.markExpired(quotationId);
      throw new AppError('Cannot reject quotation: Quotation has expired.', 400);
    }

    if (quotation.status !== QUOTATION_STATUS.PENDING_APPROVAL) {
      throw new AppError(`Cannot reject quotation in '${quotation.status}' status.`, 400);
    }

    const rejected = await quotationRepository.rejectQuotation(quotationId, {
      rejectionReason: reason.trim(),
      rejectedAt: new Date(),
    });

    return this.formatQuotationResponse(rejected);
  }

  /**
   * Retrieve quotation details by ID (Multi-role access)
   * @param {string} quotationId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getQuotationById(quotationId, requestingUser) {
    this.assertValidObjectId(quotationId, 'quotation');

    const quotation = await quotationRepository.findById(quotationId);
    if (!quotation) {
      throw new AppError('Quotation not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isCustomerOwner = quotation.userId && quotation.userId.toString() === requestingUserId.toString();
    const isAssignedMechanic = quotation.mechanicId && quotation.mechanicId.toString() === requestingUserId.toString();

    if (!isAdmin && !isCustomerOwner && !isAssignedMechanic) {
      throw new AppError('Access denied: You are not authorized to view this quotation.', 403);
    }

    // Check expiration if PENDING_APPROVAL
    if (quotation.status === QUOTATION_STATUS.PENDING_APPROVAL && quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
      await quotationRepository.markExpired(quotationId);
      quotation.status = QUOTATION_STATUS.EXPIRED;
    }

    return this.formatQuotationResponse(quotation);
  }

  /**
   * Retrieve quotation history for a booking
   * @param {string} bookingId
   * @param {object} requestingUser
   * @returns {Promise<Array<object>>}
   */
  async getQuotationsByBookingId(bookingId, requestingUser) {
    this.assertValidObjectId(bookingId, 'booking');

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isCustomerOwner = booking.userId && booking.userId.toString() === requestingUserId.toString();

    const quotations = await quotationRepository.findByBookingId(bookingId);

    // If mechanic, verify they are assigned
    if (!isAdmin && !isCustomerOwner) {
      const isMechanicForQuotes = quotations.some((q) => q.mechanicId && q.mechanicId.toString() === requestingUserId.toString());
      if (!isMechanicForQuotes) {
        throw new AppError('Access denied: You are not authorized to view quotations for this booking.', 403);
      }
    }

    return quotations.map((q) => this.formatQuotationResponse(q));
  }
}

module.exports = new QuotationService();
