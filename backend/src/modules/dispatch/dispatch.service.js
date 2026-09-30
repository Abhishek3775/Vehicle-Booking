const mongoose = require('mongoose');
const { AppError } = require('../auth/auth.service');
const dispatchRepository = require('./dispatch.repository');
const Booking = require('../booking/booking.model');
const {
  DISPATCH_STATUS,
  ASSIGNMENT_TYPES,
  ACTIVE_DISPATCH_STATUSES,
  DISPATCH_LIMITS,
} = require('./dispatch.constants');
const { BOOKING_STATUS } = require('../booking/booking.constants');
const { ROLES, ACCOUNT_STATUS } = require('../auth/auth.constants');

/**
 * Dispatch Service Layer
 *
 * Implements business logic for managing mechanic discovery, assignments, and response handling:
 * - Admin manual mechanic assignment with eligibility checks
 * - Proximity and workload-based auto-assignment
 * - Mechanic acceptance and rejection confirmation workflows
 * - Reassignment audit tracking and assignment attempt limits
 * - Strict multi-role authorization (Customer, Mechanic, Admin)
 * - Safe state machine transitions
 */
class DispatchService {
  /**
   * Format Dispatch Mongoose document into standardized API response structure
   * @param {import('./dispatch.model')} dispatch
   * @param {object} [options]
   * @returns {object}
   */
  formatDispatchResponse(dispatch, options = {}) {
    return {
      id: dispatch._id ? dispatch._id.toString() : dispatch.id,
      bookingId: dispatch.bookingId ? dispatch.bookingId.toString() : null,
      mechanicId: dispatch.mechanicId ? dispatch.mechanicId.toString() : null,
      status: dispatch.status,
      assignmentType: dispatch.assignmentType,
      assignedAt: dispatch.assignedAt,
      acceptedAt: dispatch.acceptedAt,
      rejectedAt: dispatch.rejectedAt,
      completedAt: dispatch.completedAt,
      rejectionReason: dispatch.rejectionReason || null,
      cancelledAt: dispatch.cancelledAt || null,
      cancelledBy: dispatch.cancelledBy ? dispatch.cancelledBy.toString() : null,
      cancellationReason: dispatch.cancellationReason || null,
      assignmentAttempts: dispatch.assignmentAttempts || 0,
      assignmentHistory: dispatch.assignmentHistory || [],
      notes: dispatch.notes || '',
      createdAt: dispatch.createdAt,
      updatedAt: dispatch.updatedAt,
    };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id
   * @param {string} [entityName='dispatch']
   * @throws {AppError}
   */
  assertValidObjectId(id, entityName = 'dispatch') {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${entityName} ID format.`, 400);
    }
  }

  /**
   * Calculate great-circle distance between two coordinate pairs using Haversine formula (in km)
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number}
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
      return Infinity;
    }
    const R = 6371; // Earth radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Initiate or retrieve dispatch for a booking
   * @param {string} bookingId
   * @param {string} adminUserId
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async createDispatch(bookingId, adminUserId, { notes = '', assignmentType = ASSIGNMENT_TYPES.MANUAL } = {}) {
    this.assertValidObjectId(bookingId, 'booking');

    // 1. Verify booking exists and is dispatchable
    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.CLOSED) {
      throw new AppError(`Cannot create dispatch for booking in '${booking.status}' status.`, 400);
    }

    // 2. Prevent duplicate active dispatches
    const activeDispatch = await dispatchRepository.findActiveByBookingId(bookingId);
    if (activeDispatch) {
      throw new AppError(
        `An active dispatch process already exists for this booking with status '${activeDispatch.status}'.`,
        409
      );
    }

    // 3. Create dispatch record
    const payload = {
      bookingId: new mongoose.Types.ObjectId(bookingId),
      status: DISPATCH_STATUS.PENDING,
      assignmentType,
      notes: notes ? notes.trim() : '',
      assignmentAttempts: 0,
    };

    const newDispatch = await dispatchRepository.create(payload);
    return this.formatDispatchResponse(newDispatch);
  }

  /**
   * Manually assign a mechanic to a booking (Admin only)
   * @param {string} bookingId
   * @param {string} mechanicId
   * @param {string} adminUserId
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async manualAssignMechanic(bookingId, mechanicId, adminUserId, { notes = '' } = {}) {
    this.assertValidObjectId(bookingId, 'booking');
    this.assertValidObjectId(mechanicId, 'mechanic');

    // 1. Verify booking
    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.CLOSED) {
      throw new AppError(`Cannot assign mechanic to booking in '${booking.status}' status.`, 400);
    }

    // 2. Verify mechanic existence, role, and active status
    const mechanic = await dispatchRepository.findMechanicById(mechanicId);
    if (!mechanic) {
      throw new AppError('Mechanic not found or user is not registered as a mechanic.', 404);
    }

    if (mechanic.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      throw new AppError('The selected mechanic is currently inactive.', 400);
    }

    // 3. Find active dispatch or create one
    let dispatch = await dispatchRepository.findActiveByBookingId(bookingId);

    const now = new Date();
    const historyEntry = {
      mechanicId: new mongoose.Types.ObjectId(mechanicId),
      assignmentType: ASSIGNMENT_TYPES.MANUAL,
      assignedAt: now,
      status: DISPATCH_STATUS.ASSIGNED,
    };

    if (!dispatch) {
      dispatch = await dispatchRepository.create({
        bookingId: new mongoose.Types.ObjectId(bookingId),
        mechanicId: new mongoose.Types.ObjectId(mechanicId),
        status: DISPATCH_STATUS.ASSIGNED,
        assignmentType: ASSIGNMENT_TYPES.MANUAL,
        assignedAt: now,
        assignmentAttempts: 1,
        assignmentHistory: [historyEntry],
        notes: notes ? notes.trim() : '',
      });
    } else {
      // Reassignment handling
      const updateData = {
        mechanicId: new mongoose.Types.ObjectId(mechanicId),
        status: DISPATCH_STATUS.ASSIGNED,
        assignmentType: ASSIGNMENT_TYPES.MANUAL,
        assignedAt: now,
        acceptedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        assignmentAttempts: (dispatch.assignmentAttempts || 0) + 1,
        assignmentHistory: [...(dispatch.assignmentHistory || []), historyEntry],
      };
      if (notes) {
        updateData.notes = notes.trim();
      }
      dispatch = await dispatchRepository.updateById(dispatch._id, updateData);
    }

    // 4. Update Booking status to ASSIGNED if currently PENDING
    if (booking.status === BOOKING_STATUS.PENDING) {
      await Booking.findByIdAndUpdate(bookingId, { $set: { status: BOOKING_STATUS.ASSIGNED } }).exec();
    }

    return this.formatDispatchResponse(dispatch);
  }

  /**
   * Automatically select and assign the nearest suitable mechanic to a booking
   * @param {string} bookingId
   * @param {string} adminUserId
   * @returns {Promise<object>}
   */
  async autoAssignMechanic(bookingId, adminUserId) {
    this.assertValidObjectId(bookingId, 'booking');

    // 1. Verify booking
    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.CLOSED) {
      throw new AppError(`Cannot auto-assign mechanic to booking in '${booking.status}' status.`, 400);
    }

    // 2. Find active dispatch or create one
    let dispatch = await dispatchRepository.findActiveByBookingId(bookingId);
    if (!dispatch) {
      dispatch = await dispatchRepository.create({
        bookingId: new mongoose.Types.ObjectId(bookingId),
        status: DISPATCH_STATUS.SEARCHING,
        assignmentType: ASSIGNMENT_TYPES.AUTO,
        assignmentAttempts: 0,
      });
    }

    // 3. Check attempt limit
    if ((dispatch.assignmentAttempts || 0) >= DISPATCH_LIMITS.MAX_ASSIGNMENT_ATTEMPTS) {
      await dispatchRepository.updateById(dispatch._id, { status: DISPATCH_STATUS.FAILED });
      throw new AppError(
        `Maximum assignment attempts (${DISPATCH_LIMITS.MAX_ASSIGNMENT_ATTEMPTS}) exceeded for this booking.`,
        400
      );
    }

    // 4. Find all active mechanics on the platform
    const eligibleMechanics = await dispatchRepository.findEligibleMechanics();
    if (eligibleMechanics.length === 0) {
      await dispatchRepository.updateById(dispatch._id, { status: DISPATCH_STATUS.FAILED });
      throw new AppError('No active mechanics are currently registered or available on the platform.', 404);
    }

    // 5. Exclude mechanics who already rejected this specific booking
    const rejectedMechanicIds = new Set(
      (dispatch.assignmentHistory || [])
        .filter((h) => h.status === DISPATCH_STATUS.REJECTED)
        .map((h) => h.mechanicId.toString())
    );

    const candidates = eligibleMechanics.filter((m) => !rejectedMechanicIds.has(m.userId.toString()));
    if (candidates.length === 0) {
      await dispatchRepository.updateById(dispatch._id, { status: DISPATCH_STATUS.FAILED });
      throw new AppError('All eligible mechanics have already rejected or been assigned to this booking.', 404);
    }

    // 6. Extract booking coordinates if available
    const customerLat =
      booking.locationSnapshot?.latitude ?? booking.addressSnapshot?.latitude ?? null;
    const customerLng =
      booking.locationSnapshot?.longitude ?? booking.addressSnapshot?.longitude ?? null;

    // 7. Calculate workload and distance for each candidate
    const candidateRankings = await Promise.all(
      candidates.map(async (mechanic) => {
        const activeJobs = await dispatchRepository.findMechanicActiveAssignments(mechanic.userId);
        let distanceKm = Infinity;
        if (customerLat !== null && customerLng !== null) {
          const mechanicLat = mechanic.preferences?.latitude ?? null;
          const mechanicLng = mechanic.preferences?.longitude ?? null;
          if (mechanicLat !== null && mechanicLng !== null) {
            distanceKm = this.calculateDistance(customerLat, customerLng, mechanicLat, mechanicLng);
          }
        }
        return {
          mechanic,
          activeJobCount: activeJobs.length,
          distanceKm,
        };
      })
    );

    // Sort by fewest active jobs first, then by nearest distance
    candidateRankings.sort((a, b) => {
      if (a.activeJobCount !== b.activeJobCount) {
        return a.activeJobCount - b.activeJobCount;
      }
      return a.distanceKm - b.distanceKm;
    });

    const selectedMechanic = candidateRankings[0].mechanic;
    const now = new Date();
    const historyEntry = {
      mechanicId: new mongoose.Types.ObjectId(selectedMechanic.userId),
      assignmentType: ASSIGNMENT_TYPES.AUTO,
      assignedAt: now,
      status: DISPATCH_STATUS.ASSIGNED,
    };

    const updatedDispatch = await dispatchRepository.updateById(dispatch._id, {
      mechanicId: new mongoose.Types.ObjectId(selectedMechanic.userId),
      status: DISPATCH_STATUS.ASSIGNED,
      assignmentType: ASSIGNMENT_TYPES.AUTO,
      assignedAt: now,
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      assignmentAttempts: (dispatch.assignmentAttempts || 0) + 1,
      assignmentHistory: [...(dispatch.assignmentHistory || []), historyEntry],
    });

    // Update Booking status to ASSIGNED if currently PENDING
    if (booking.status === BOOKING_STATUS.PENDING) {
      await Booking.findByIdAndUpdate(bookingId, { $set: { status: BOOKING_STATUS.ASSIGNED } }).exec();
    }

    return this.formatDispatchResponse(updatedDispatch);
  }

  /**
   * Mechanic accepts assignment
   * @param {string} dispatchId
   * @param {string} mechanicUserId
   * @returns {Promise<object>}
   */
  async acceptAssignment(dispatchId, mechanicUserId) {
    this.assertValidObjectId(dispatchId, 'dispatch');
    this.assertValidObjectId(mechanicUserId, 'mechanic');

    const dispatch = await dispatchRepository.findById(dispatchId);
    if (!dispatch) {
      throw new AppError('Dispatch record not found.', 404);
    }

    // 1. Verify mechanic authorization
    if (!dispatch.mechanicId || dispatch.mechanicId.toString() !== mechanicUserId.toString()) {
      throw new AppError('Forbidden. You are not assigned to this dispatch request.', 403);
    }

    // 2. Validate current status is ASSIGNED
    if (dispatch.status !== DISPATCH_STATUS.ASSIGNED) {
      throw new AppError(
        `Cannot accept assignment in '${dispatch.status}' status. Dispatch must be in ASSIGNED status.`,
        400
      );
    }

    const now = new Date();

    // Update assignment history
    const history = dispatch.assignmentHistory || [];
    const latestIndex = history.length - 1;
    if (latestIndex >= 0 && history[latestIndex].mechanicId.toString() === mechanicUserId.toString()) {
      history[latestIndex].status = DISPATCH_STATUS.ACCEPTED;
      history[latestIndex].acceptedAt = now;
    }

    const updatedDispatch = await dispatchRepository.updateById(dispatchId, {
      status: DISPATCH_STATUS.ACCEPTED,
      acceptedAt: now,
      assignmentHistory: history,
    });

    // Update Booking status to ACCEPTED
    await Booking.findByIdAndUpdate(dispatch.bookingId, {
      $set: { status: BOOKING_STATUS.ACCEPTED },
    }).exec();

    return this.formatDispatchResponse(updatedDispatch);
  }

  /**
   * Mechanic rejects assignment
   * @param {string} dispatchId
   * @param {string} mechanicUserId
   * @param {string} rejectionReason
   * @returns {Promise<object>}
   */
  async rejectAssignment(dispatchId, mechanicUserId, rejectionReason) {
    this.assertValidObjectId(dispatchId, 'dispatch');
    this.assertValidObjectId(mechanicUserId, 'mechanic');

    const dispatch = await dispatchRepository.findById(dispatchId);
    if (!dispatch) {
      throw new AppError('Dispatch record not found.', 404);
    }

    // 1. Verify mechanic authorization
    if (!dispatch.mechanicId || dispatch.mechanicId.toString() !== mechanicUserId.toString()) {
      throw new AppError('Forbidden. You are not assigned to this dispatch request.', 403);
    }

    // 2. Validate current status is ASSIGNED
    if (dispatch.status !== DISPATCH_STATUS.ASSIGNED) {
      throw new AppError(
        `Cannot reject assignment in '${dispatch.status}' status. Dispatch must be in ASSIGNED status.`,
        400
      );
    }

    const now = new Date();

    // Update assignment history
    const history = dispatch.assignmentHistory || [];
    const latestIndex = history.length - 1;
    if (latestIndex >= 0 && history[latestIndex].mechanicId.toString() === mechanicUserId.toString()) {
      history[latestIndex].status = DISPATCH_STATUS.REJECTED;
      history[latestIndex].rejectionReason = rejectionReason.trim();
      history[latestIndex].rejectedAt = now;
    }

    const updatedDispatch = await dispatchRepository.updateById(dispatchId, {
      status: DISPATCH_STATUS.REJECTED,
      rejectedAt: now,
      rejectionReason: rejectionReason.trim(),
      assignmentHistory: history,
    });

    return this.formatDispatchResponse(updatedDispatch);
  }

  /**
   * Retrieve dispatch by ID with multi-role access control
   * @param {string} dispatchId
   * @param {object} userContext - { userId, role }
   * @returns {Promise<object>}
   */
  async getDispatchById(dispatchId, userContext) {
    this.assertValidObjectId(dispatchId, 'dispatch');

    const dispatch = await dispatchRepository.findById(dispatchId);
    if (!dispatch) {
      throw new AppError('Dispatch record not found.', 404);
    }

    const booking = await Booking.findById(dispatch.bookingId).exec();
    if (!booking) {
      throw new AppError('Associated booking not found.', 404);
    }

    // Role-based authorization guard
    if (userContext.role === ROLES.ADMIN) {
      return this.formatDispatchResponse(dispatch);
    }

    if (userContext.role === ROLES.CUSTOMER) {
      if (booking.userId.toString() !== userContext.userId.toString()) {
        throw new AppError('Dispatch record not found.', 404);
      }
      return this.formatDispatchResponse(dispatch);
    }

    if (userContext.role === ROLES.MECHANIC) {
      if (!dispatch.mechanicId || dispatch.mechanicId.toString() !== userContext.userId.toString()) {
        throw new AppError('Forbidden. You do not have permission to access this dispatch.', 403);
      }
      return this.formatDispatchResponse(dispatch);
    }

    throw new AppError('Forbidden.', 403);
  }

  /**
   * Retrieve dispatch information by booking ID (Customer or Admin)
   * @param {string} bookingId
   * @param {object} userContext - { userId, role }
   * @returns {Promise<object>}
   */
  async getDispatchByBookingId(bookingId, userContext) {
    this.assertValidObjectId(bookingId, 'booking');

    const booking = await Booking.findById(bookingId).exec();
    if (!booking) {
      throw new AppError('Booking not found.', 404);
    }

    // Customer can only view dispatch for their own booking
    if (userContext.role === ROLES.CUSTOMER && booking.userId.toString() !== userContext.userId.toString()) {
      throw new AppError('Booking not found.', 404);
    }

    // Look for active dispatch or latest dispatch
    let dispatch = await dispatchRepository.findActiveByBookingId(bookingId);
    if (!dispatch) {
      const allDispatches = await dispatchRepository.findByBookingId(bookingId);
      if (allDispatches.length === 0) {
        throw new AppError('No dispatch records found for this booking.', 404);
      }
      dispatch = allDispatches[0];
    }

    return this.formatDispatchResponse(dispatch);
  }

  /**
   * Cancel dispatch process (Admin only)
   * @param {string} dispatchId
   * @param {string} adminUserId
   * @param {string} [cancellationReason]
   * @returns {Promise<object>}
   */
  async cancelDispatch(dispatchId, adminUserId, cancellationReason = '') {
    this.assertValidObjectId(dispatchId, 'dispatch');

    const dispatch = await dispatchRepository.findById(dispatchId);
    if (!dispatch) {
      throw new AppError('Dispatch record not found.', 404);
    }

    if (dispatch.status === DISPATCH_STATUS.COMPLETED || dispatch.status === DISPATCH_STATUS.CANCELLED) {
      throw new AppError(`Cannot cancel dispatch in '${dispatch.status}' status.`, 400);
    }

    const updatedDispatch = await dispatchRepository.updateById(dispatchId, {
      status: DISPATCH_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: new mongoose.Types.ObjectId(adminUserId),
      cancellationReason: cancellationReason ? cancellationReason.trim() : 'Cancelled by administrator',
    });

    return this.formatDispatchResponse(updatedDispatch);
  }
}

module.exports = {
  DispatchService,
  AppError,
  dispatchService: new DispatchService(),
};
