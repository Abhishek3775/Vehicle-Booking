const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const inspectionRepository = require('./inspection.repository');
const Booking = require('../booking/booking.model');
const Dispatch = require('../dispatch/dispatch.model');
const Service = require('../service/service.model');
const {
  INSPECTION_STATUS,
  PAGINATION_LIMITS,
} = require('./inspection.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { ROLES } = require('../auth/auth.constants');

/**
 * Inspection Service Layer
 *
 * Implements business logic for managing vehicle inspection lifecycles:
 * - Mechanic assignment validation before inspection commencement
 * - Unique inspection reference generation (INSP-YYYYMMDD-XXXX)
 * - Controlled status flow (IN_PROGRESS -> COMPLETED)
 * - Dynamic checklist, findings, and recommended service/part capture
 * - Service catalogue validation for recommended services
 * - Multi-role access control (Customer, Mechanic, Admin)
 * - Customer acknowledgement workflows
 * - Booking state synchronization
 */
class InspectionService {
  /**
   * Format Inspection Mongoose document into standardized API response structure
   * @param {import('./inspection.model')} inspection
   * @returns {object}
   */
  formatInspectionResponse(inspection) {
    return {
      id: inspection._id ? inspection._id.toString() : inspection.id,
      inspectionReference: inspection.inspectionReference,
      bookingId: inspection.bookingId ? (inspection.bookingId._id ? inspection.bookingId._id.toString() : inspection.bookingId.toString()) : null,
      mechanicId: inspection.mechanicId ? (inspection.mechanicId._id ? inspection.mechanicId._id.toString() : inspection.mechanicId.toString()) : null,
      userId: inspection.userId ? (inspection.userId._id ? inspection.userId._id.toString() : inspection.userId.toString()) : null,
      vehicleId: inspection.vehicleId ? (inspection.vehicleId._id ? inspection.vehicleId._id.toString() : inspection.vehicleId.toString()) : null,
      status: inspection.status,
      startedAt: inspection.startedAt,
      completedAt: inspection.completedAt || null,
      overallCondition: inspection.overallCondition || null,
      customerComplaint: inspection.customerComplaint || '',
      findings: (inspection.findings || []).map((f) => ({
        id: f._id ? f._id.toString() : f.id,
        title: f.title,
        description: f.description || '',
        severity: f.severity,
        category: f.category,
      })),
      recommendedServices: (inspection.recommendedServices || []).map((rs) => ({
        id: rs._id ? rs._id.toString() : rs.id,
        serviceId: rs.serviceId
          ? rs.serviceId._id
            ? {
                id: rs.serviceId._id.toString(),
                name: rs.serviceId.name,
                category: rs.serviceId.category,
                basePrice: rs.serviceId.basePrice,
                estimatedDuration: rs.serviceId.estimatedDuration,
              }
            : rs.serviceId.toString()
          : null,
        reason: rs.reason || '',
        priority: rs.priority,
      })),
      recommendedParts: (inspection.recommendedParts || []).map((rp) => ({
        id: rp._id ? rp._id.toString() : rp.id,
        name: rp.name,
        quantity: rp.quantity || 1,
        reason: rp.reason || '',
        priority: rp.priority,
      })),
      checklist: (inspection.checklist || []).map((c) => ({
        id: c._id ? c._id.toString() : c.id,
        category: c.category,
        item: c.item,
        condition: c.condition,
        observation: c.observation || '',
      })),
      photos: (inspection.photos || []).map((p) => ({
        id: p._id ? p._id.toString() : p.id,
        url: p.url,
        publicId: p.publicId || null,
        category: p.category,
        caption: p.caption || '',
        uploadedAt: p.uploadedAt,
      })),
      videos: (inspection.videos || []).map((v) => ({
        id: v._id ? v._id.toString() : v.id,
        url: v.url,
        publicId: v.publicId || null,
        caption: v.caption || '',
        uploadedAt: v.uploadedAt,
      })),
      mechanicNotes: inspection.mechanicNotes || '',
      customerNotes: inspection.customerNotes || '',
      customerAcknowledgement: inspection.customerAcknowledgement
        ? {
            acknowledged: Boolean(inspection.customerAcknowledgement.acknowledged),
            acknowledgedAt: inspection.customerAcknowledgement.acknowledgedAt || null,
            acknowledgedBy: inspection.customerAcknowledgement.acknowledgedBy
              ? (inspection.customerAcknowledgement.acknowledgedBy._id
                  ? inspection.customerAcknowledgement.acknowledgedBy._id.toString()
                  : inspection.customerAcknowledgement.acknowledgedBy.toString())
              : null,
          }
        : {
            acknowledged: false,
            acknowledgedAt: null,
            acknowledgedBy: null,
          },
      createdAt: inspection.createdAt,
      updatedAt: inspection.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='inspection']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'inspection') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Generate a unique human-readable inspection reference
   * Example: INSP-20260926-0042
   * @returns {Promise<string>}
   */
  async generateInspectionReference() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const ref = `INSP-${dateStr}-${randomSuffix}`;

      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const existing = await inspectionRepository.findByReference(ref);
        if (!existing) {
          return ref;
        }
      } else {
        return ref;
      }
    }

    return `INSP-${dateStr}-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Start a new vehicle inspection for a booking (Assigned mechanic or Admin)
   * @param {string} bookingId
   * @param {object} requestingUser
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async startInspection(bookingId, requestingUser, { customerNotes = '', mechanicNotes = '' } = {}) {
    this.assertValidObjectId(bookingId, 'booking');

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;

    // Must be a registered mechanic or Admin
    if (!isAdmin && requestingUser.role !== ROLES.MECHANIC) {
      throw new AppError('Access denied: Only mechanics assigned to the booking can start inspection.', 403);
    }

    // 1. Verify booking existence
    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.CLOSED) {
      throw new AppError(`Cannot start inspection for booking in '${booking.status}' status.`, 400);
    }

    // 2. Verify mechanic assignment
    const activeDispatch = await Dispatch.findOne({
      bookingId,
      status: { $in: ['ASSIGNED', 'ACCEPTED', 'PENDING'] },
    }).exec();

    let mechanicId = null;

    if (isAdmin) {
      mechanicId = activeDispatch?.mechanicId || requestingUserId;
    } else {
      if (!activeDispatch || !activeDispatch.mechanicId || activeDispatch.mechanicId.toString() !== requestingUserId.toString()) {
        throw new AppError('Access denied: You are not assigned to perform service for this booking.', 403);
      }

      mechanicId = requestingUserId;
    }

    // 3. Prevent duplicate active inspections for the same booking
    const activeInspection = await inspectionRepository.findActiveByBookingId(bookingId);
    if (activeInspection) {
      throw new AppError('An active inspection is already in progress for this booking.', 409);
    }

    // 4. Generate unique inspection reference
    const inspectionReference = await this.generateInspectionReference();

    // 5. Create inspection record
    const inspectionData = {
      inspectionReference,
      bookingId: booking._id,
      mechanicId: new mongoose.Types.ObjectId(mechanicId),
      userId: booking.userId,
      vehicleId: booking.vehicleId,
      status: INSPECTION_STATUS.IN_PROGRESS,
      startedAt: new Date(),
      customerComplaint: booking.customerNotes || '',
      customerNotes: customerNotes ? customerNotes.trim() : '',
      mechanicNotes: mechanicNotes ? mechanicNotes.trim() : '',
    };

    const newInspection = await inspectionRepository.create(inspectionData);

    // 6. Transition booking status to INSPECTION if applicable
    if (
      booking.status === BOOKING_STATUS.ARRIVED ||
      booking.status === BOOKING_STATUS.ACCEPTED ||
      booking.status === BOOKING_STATUS.ASSIGNED ||
      booking.status === BOOKING_STATUS.PENDING
    ) {
      await Booking.findByIdAndUpdate(bookingId, { $set: { status: BOOKING_STATUS.INSPECTION } }).exec();
    }

    return this.formatInspectionResponse(newInspection);
  }

  /**
   * Update active inspection data (Assigned mechanic or Admin)
   * @param {string} inspectionId
   * @param {object} updateData
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async updateInspection(inspectionId, updateData, requestingUser) {
    this.assertValidObjectId(inspectionId, 'inspection');

    const inspection = await inspectionRepository.findById(inspectionId, { populateServices: false });
    if (!inspection) {
      throw new AppError('Inspection not found.', 404);
    }

    if (inspection.status !== INSPECTION_STATUS.IN_PROGRESS) {
      throw new AppError(`Cannot update inspection in '${inspection.status}' status. Only IN_PROGRESS inspections can be edited.`, 400);
    }

    // Authorization check
    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isAssignedMechanic = inspection.mechanicId && inspection.mechanicId.toString() === requestingUserId.toString();

    if (!isAdmin && !isAssignedMechanic) {
      throw new AppError('Access denied: You are not authorized to update this inspection.', 403);
    }

    // Validate recommendedServices if provided
    if (updateData.recommendedServices && updateData.recommendedServices.length > 0) {
      const serviceIds = updateData.recommendedServices.map((rs) => rs.serviceId);
      const validServicesCount = await Service.countDocuments({ _id: { $in: serviceIds } }).exec();

      if (validServicesCount !== serviceIds.length) {
        throw new AppError('One or more recommended service IDs do not exist in the service catalogue.', 400);
      }
    }

    const updated = await inspectionRepository.updateById(inspectionId, updateData);
    return this.formatInspectionResponse(updated);
  }

  /**
   * Complete vehicle inspection (Assigned mechanic or Admin)
   * @param {string} inspectionId
   * @param {object} requestingUser
   * @param {object} [completionData]
   * @returns {Promise<object>}
   */
  async completeInspection(inspectionId, requestingUser, { overallCondition, mechanicNotes } = {}) {
    this.assertValidObjectId(inspectionId, 'inspection');

    const inspection = await inspectionRepository.findById(inspectionId, { populateServices: false });
    if (!inspection) {
      throw new AppError('Inspection not found.', 404);
    }

    if (inspection.status === INSPECTION_STATUS.COMPLETED) {
      throw new AppError('Inspection is already completed.', 400);
    }

    if (inspection.status === INSPECTION_STATUS.CANCELLED) {
      throw new AppError('Cannot complete a cancelled inspection.', 400);
    }

    // Authorization check
    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isAssignedMechanic = inspection.mechanicId && inspection.mechanicId.toString() === requestingUserId.toString();

    if (!isAdmin && !isAssignedMechanic) {
      throw new AppError('Access denied: You are not authorized to complete this inspection.', 403);
    }

    const completedInspection = await inspectionRepository.completeInspection(inspectionId, {
      completedAt: new Date(),
      overallCondition,
      mechanicNotes,
    });

    // Update booking status to QUOTE_PENDING
    if (inspection.bookingId) {
      await Booking.findByIdAndUpdate(inspection.bookingId, {
        $set: { status: BOOKING_STATUS.QUOTE_PENDING },
      }).exec();
    }

    return this.formatInspectionResponse(completedInspection);
  }

  /**
   * Retrieve inspection details by ID (Multi-role access)
   * @param {string} inspectionId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getInspectionById(inspectionId, requestingUser) {
    this.assertValidObjectId(inspectionId, 'inspection');

    const inspection = await inspectionRepository.findById(inspectionId);
    if (!inspection) {
      throw new AppError('Inspection not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isCustomerOwner = inspection.userId && inspection.userId.toString() === requestingUserId.toString();
    const isAssignedMechanic = inspection.mechanicId && inspection.mechanicId.toString() === requestingUserId.toString();

    if (!isAdmin && !isCustomerOwner && !isAssignedMechanic) {
      throw new AppError('Access denied: You are not authorized to view this inspection.', 403);
    }

    return this.formatInspectionResponse(inspection);
  }

  /**
   * Retrieve inspection for a specific booking
   * @param {string} bookingId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async getInspectionByBookingId(bookingId, requestingUser) {
    this.assertValidObjectId(bookingId, 'booking');

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isCustomerOwner = booking.userId && booking.userId.toString() === requestingUserId.toString();

    // Check if mechanic is assigned to this booking
    let isAssignedMechanic = false;
    if (requestingUser.role === ROLES.MECHANIC) {
      const activeDispatch = await Dispatch.findOne({
        bookingId,
        mechanicId: requestingUserId,
      }).exec();
      if (activeDispatch) {
        isAssignedMechanic = true;
      }
    }

    if (!isAdmin && !isCustomerOwner && !isAssignedMechanic) {
      throw new AppError('Access denied: You are not authorized to view inspections for this booking.', 403);
    }

    const inspection = await inspectionRepository.findByBookingId(bookingId);
    if (!inspection) {
      throw new AppError('No inspection found for this booking.', 404);
    }

    return this.formatInspectionResponse(inspection);
  }

  /**
   * Customer acknowledges completed inspection findings
   * @param {string} inspectionId
   * @param {object} requestingUser
   * @returns {Promise<object>}
   */
  async acknowledgeInspection(inspectionId, requestingUser) {
    this.assertValidObjectId(inspectionId, 'inspection');

    const inspection = await inspectionRepository.findById(inspectionId, { populateServices: false });
    if (!inspection) {
      throw new AppError('Inspection not found.', 404);
    }

    const requestingUserId = requestingUser.userId || requestingUser._id || requestingUser.id;
    const isCustomerOwner = inspection.userId && inspection.userId.toString() === requestingUserId.toString();

    if (!isCustomerOwner && requestingUser.role !== ROLES.ADMIN) {
      throw new AppError('Access denied: Only the customer who owns this booking can acknowledge the inspection.', 403);
    }

    if (inspection.status !== INSPECTION_STATUS.COMPLETED) {
      throw new AppError(`Cannot acknowledge inspection: Inspection is currently in '${inspection.status}' status. Inspection must be in COMPLETED status to be acknowledged.`, 400);
    }

    const acknowledged = await inspectionRepository.acknowledgeInspection(inspectionId, {
      acknowledgedBy: new mongoose.Types.ObjectId(requestingUserId),
      acknowledgedAt: new Date(),
    });

    return this.formatInspectionResponse(acknowledged);
  }
}

module.exports = new InspectionService();
