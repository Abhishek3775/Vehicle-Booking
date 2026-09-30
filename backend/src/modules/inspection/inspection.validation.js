const mongoose = require('mongoose');
const {
  OVERALL_CONDITION,
  CHECKLIST_CONDITION,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  INSPECTION_CATEGORIES,
  PHOTO_CATEGORIES,
  INSPECTION_LIMITS,
} = require('./inspection.constants');

const FORBIDDEN_UPDATE_FIELDS = [
  'bookingId',
  'userId',
  'vehicleId',
  'mechanicId',
  'inspectionReference',
  'status',
  'startedAt',
  'completedAt',
  'customerAcknowledgement',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
];

/**
 * Middleware: Validate bookingId URL parameter
 */
const validateBookingIdParam = (req, res, next) => {
  const { bookingId } = req.params;

  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid booking ID format.',
      error: { fields: { bookingId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate inspectionId URL parameter
 */
const validateInspectionIdParam = (req, res, next) => {
  const { inspectionId } = req.params;

  if (!inspectionId || !mongoose.Types.ObjectId.isValid(inspectionId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid inspection ID format.',
      error: { fields: { inspectionId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate PUT /api/inspections/:inspectionId payload
 */
const validateUpdateInspection = (req, res, next) => {
  const errors = {};
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Request body must contain at least one field to update.',
      error: { fields: { body: 'Empty update payload' } },
    });
  }

  // 1. Detect forbidden fields
  for (const field of FORBIDDEN_UPDATE_FIELDS) {
    if (field in body) {
      errors[field] = `Modifying '${field}' is strictly prohibited.`;
    }
  }

  // 2. overallCondition
  if (body.overallCondition !== undefined && body.overallCondition !== null) {
    if (typeof body.overallCondition !== 'string') {
      errors.overallCondition = 'Overall condition must be a string.';
    } else {
      const normalized = body.overallCondition.toUpperCase().trim();
      if (!Object.values(OVERALL_CONDITION).includes(normalized)) {
        errors.overallCondition = `Invalid overall condition. Allowed values: ${Object.values(OVERALL_CONDITION).join(', ')}.`;
      } else {
        req.body.overallCondition = normalized;
      }
    }
  }

  // 3. customerComplaint
  if (body.customerComplaint !== undefined && body.customerComplaint !== null) {
    if (typeof body.customerComplaint !== 'string') {
      errors.customerComplaint = 'Customer complaint must be a string.';
    } else {
      req.body.customerComplaint = body.customerComplaint.trim();
    }
  }

  // 4. mechanicNotes
  if (body.mechanicNotes !== undefined && body.mechanicNotes !== null) {
    if (typeof body.mechanicNotes !== 'string') {
      errors.mechanicNotes = 'Mechanic notes must be a string.';
    } else if (body.mechanicNotes.trim().length > INSPECTION_LIMITS.NOTES_MAX_LENGTH) {
      errors.mechanicNotes = `Mechanic notes cannot exceed ${INSPECTION_LIMITS.NOTES_MAX_LENGTH} characters.`;
    } else {
      req.body.mechanicNotes = body.mechanicNotes.trim();
    }
  }

  // 5. customerNotes
  if (body.customerNotes !== undefined && body.customerNotes !== null) {
    if (typeof body.customerNotes !== 'string') {
      errors.customerNotes = 'Customer notes must be a string.';
    } else if (body.customerNotes.trim().length > INSPECTION_LIMITS.NOTES_MAX_LENGTH) {
      errors.customerNotes = `Customer notes cannot exceed ${INSPECTION_LIMITS.NOTES_MAX_LENGTH} characters.`;
    } else {
      req.body.customerNotes = body.customerNotes.trim();
    }
  }

  // 6. checklist
  if (body.checklist !== undefined && body.checklist !== null) {
    if (!Array.isArray(body.checklist)) {
      errors.checklist = 'Checklist must be an array of checklist item objects.';
    } else {
      const sanitizedChecklist = [];
      for (let i = 0; i < body.checklist.length; i++) {
        const item = body.checklist[i];
        if (!item || typeof item !== 'object') {
          errors[`checklist[${i}]`] = 'Each checklist entry must be an object.';
          break;
        }

        if (!item.item || typeof item.item !== 'string' || !item.item.trim()) {
          errors[`checklist[${i}].item`] = 'Checklist item name is required.';
          break;
        }

        let category = INSPECTION_CATEGORIES.OTHER;
        if (item.category) {
          const normCat = item.category.toUpperCase().trim();
          if (!Object.values(INSPECTION_CATEGORIES).includes(normCat)) {
            errors[`checklist[${i}].category`] = `Invalid category '${item.category}'. Allowed: ${Object.values(INSPECTION_CATEGORIES).join(', ')}.`;
            break;
          }
          category = normCat;
        }

        let condition = CHECKLIST_CONDITION.NOT_CHECKED;
        if (item.condition) {
          const normCond = item.condition.toUpperCase().trim();
          if (!Object.values(CHECKLIST_CONDITION).includes(normCond)) {
            errors[`checklist[${i}].condition`] = `Invalid condition '${item.condition}'. Allowed: ${Object.values(CHECKLIST_CONDITION).join(', ')}.`;
            break;
          }
          condition = normCond;
        }

        sanitizedChecklist.push({
          category,
          item: item.item.trim(),
          condition,
          observation: item.observation ? String(item.observation).trim() : '',
        });
      }
      req.body.checklist = sanitizedChecklist;
    }
  }

  // 7. findings
  if (body.findings !== undefined && body.findings !== null) {
    if (!Array.isArray(body.findings)) {
      errors.findings = 'Findings must be an array of finding objects.';
    } else {
      const sanitizedFindings = [];
      for (let i = 0; i < body.findings.length; i++) {
        const finding = body.findings[i];
        if (!finding || typeof finding !== 'object') {
          errors[`findings[${i}]`] = 'Each finding entry must be an object.';
          break;
        }

        if (!finding.title || typeof finding.title !== 'string' || !finding.title.trim()) {
          errors[`findings[${i}].title`] = 'Finding title is required.';
          break;
        }

        const trimmedTitle = finding.title.trim();
        if (
          trimmedTitle.length < INSPECTION_LIMITS.TITLE_MIN_LENGTH ||
          trimmedTitle.length > INSPECTION_LIMITS.TITLE_MAX_LENGTH
        ) {
          errors[`findings[${i}].title`] = `Title must be between ${INSPECTION_LIMITS.TITLE_MIN_LENGTH} and ${INSPECTION_LIMITS.TITLE_MAX_LENGTH} characters.`;
          break;
        }

        let severity = SEVERITY_LEVELS.MEDIUM;
        if (finding.severity) {
          const normSev = finding.severity.toUpperCase().trim();
          if (!Object.values(SEVERITY_LEVELS).includes(normSev)) {
            errors[`findings[${i}].severity`] = `Invalid severity '${finding.severity}'. Allowed: ${Object.values(SEVERITY_LEVELS).join(', ')}.`;
            break;
          }
          severity = normSev;
        }

        let category = INSPECTION_CATEGORIES.OTHER;
        if (finding.category) {
          const normCat = finding.category.toUpperCase().trim();
          if (!Object.values(INSPECTION_CATEGORIES).includes(normCat)) {
            errors[`findings[${i}].category`] = `Invalid category '${finding.category}'. Allowed: ${Object.values(INSPECTION_CATEGORIES).join(', ')}.`;
            break;
          }
          category = normCat;
        }

        sanitizedFindings.push({
          title: trimmedTitle,
          description: finding.description ? String(finding.description).trim() : '',
          severity,
          category,
        });
      }
      req.body.findings = sanitizedFindings;
    }
  }

  // 8. recommendedServices
  if (body.recommendedServices !== undefined && body.recommendedServices !== null) {
    if (!Array.isArray(body.recommendedServices)) {
      errors.recommendedServices = 'Recommended services must be an array of objects.';
    } else {
      const sanitizedServices = [];
      for (let i = 0; i < body.recommendedServices.length; i++) {
        const rec = body.recommendedServices[i];
        if (!rec || typeof rec !== 'object') {
          errors[`recommendedServices[${i}]`] = 'Each recommended service entry must be an object.';
          break;
        }

        if (!rec.serviceId || !mongoose.Types.ObjectId.isValid(String(rec.serviceId).trim())) {
          errors[`recommendedServices[${i}].serviceId`] = 'Valid Service ObjectId is required.';
          break;
        }

        let priority = PRIORITY_LEVELS.MEDIUM;
        if (rec.priority) {
          const normPrio = rec.priority.toUpperCase().trim();
          if (!Object.values(PRIORITY_LEVELS).includes(normPrio)) {
            errors[`recommendedServices[${i}].priority`] = `Invalid priority '${rec.priority}'. Allowed: ${Object.values(PRIORITY_LEVELS).join(', ')}.`;
            break;
          }
          priority = normPrio;
        }

        sanitizedServices.push({
          serviceId: String(rec.serviceId).trim(),
          reason: rec.reason ? String(rec.reason).trim() : '',
          priority,
        });
      }
      req.body.recommendedServices = sanitizedServices;
    }
  }

  // 9. recommendedParts
  if (body.recommendedParts !== undefined && body.recommendedParts !== null) {
    if (!Array.isArray(body.recommendedParts)) {
      errors.recommendedParts = 'Recommended parts must be an array of objects.';
    } else {
      const sanitizedParts = [];
      for (let i = 0; i < body.recommendedParts.length; i++) {
        const part = body.recommendedParts[i];
        if (!part || typeof part !== 'object') {
          errors[`recommendedParts[${i}]`] = 'Each recommended part entry must be an object.';
          break;
        }

        if (!part.name || typeof part.name !== 'string' || !part.name.trim()) {
          errors[`recommendedParts[${i}].name`] = 'Part name is required.';
          break;
        }

        const qty = part.quantity !== undefined ? Number(part.quantity) : 1;
        if (isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
          errors[`recommendedParts[${i}].quantity`] = 'Quantity must be an integer >= 1.';
          break;
        }

        let priority = PRIORITY_LEVELS.MEDIUM;
        if (part.priority) {
          const normPrio = part.priority.toUpperCase().trim();
          if (!Object.values(PRIORITY_LEVELS).includes(normPrio)) {
            errors[`recommendedParts[${i}].priority`] = `Invalid priority '${part.priority}'. Allowed: ${Object.values(PRIORITY_LEVELS).join(', ')}.`;
            break;
          }
          priority = normPrio;
        }

        sanitizedParts.push({
          name: part.name.trim(),
          quantity: qty,
          reason: part.reason ? String(part.reason).trim() : '',
          priority,
        });
      }
      req.body.recommendedParts = sanitizedParts;
    }
  }

  // 10. photos
  if (body.photos !== undefined && body.photos !== null) {
    if (!Array.isArray(body.photos)) {
      errors.photos = 'Photos must be an array of photo objects.';
    } else {
      const sanitizedPhotos = [];
      for (let i = 0; i < body.photos.length; i++) {
        const photo = body.photos[i];
        if (!photo || typeof photo !== 'object') {
          errors[`photos[${i}]`] = 'Each photo entry must be an object.';
          break;
        }

        if (!photo.url || typeof photo.url !== 'string' || !photo.url.trim()) {
          errors[`photos[${i}].url`] = 'Photo URL is required.';
          break;
        }

        let category = PHOTO_CATEGORIES.VEHICLE;
        if (photo.category) {
          const normCat = photo.category.toUpperCase().trim();
          if (!Object.values(PHOTO_CATEGORIES).includes(normCat)) {
            errors[`photos[${i}].category`] = `Invalid photo category '${photo.category}'. Allowed: ${Object.values(PHOTO_CATEGORIES).join(', ')}.`;
            break;
          }
          category = normCat;
        }

        sanitizedPhotos.push({
          url: photo.url.trim(),
          publicId: photo.publicId ? String(photo.publicId).trim() : null,
          category,
          caption: photo.caption ? String(photo.caption).trim() : '',
        });
      }
      req.body.photos = sanitizedPhotos;
    }
  }

  // 11. videos
  if (body.videos !== undefined && body.videos !== null) {
    if (!Array.isArray(body.videos)) {
      errors.videos = 'Videos must be an array of video objects.';
    } else {
      const sanitizedVideos = [];
      for (let i = 0; i < body.videos.length; i++) {
        const video = body.videos[i];
        if (!video || typeof video !== 'object') {
          errors[`videos[${i}]`] = 'Each video entry must be an object.';
          break;
        }

        if (!video.url || typeof video.url !== 'string' || !video.url.trim()) {
          errors[`videos[${i}].url`] = 'Video URL is required.';
          break;
        }

        sanitizedVideos.push({
          url: video.url.trim(),
          publicId: video.publicId ? String(video.publicId).trim() : null,
          caption: video.caption ? String(video.caption).trim() : '',
        });
      }
      req.body.videos = sanitizedVideos;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: errors },
    });
  }

  next();
};

module.exports = {
  validateBookingIdParam,
  validateInspectionIdParam,
  validateUpdateInspection,
};
