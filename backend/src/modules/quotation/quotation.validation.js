const mongoose = require('mongoose');
const {
  ITEM_TYPES,
  DISCOUNT_TYPES,
  QUOTATION_LIMITS,
} = require('./quotation.constants');

const FORBIDDEN_CREATE_FIELDS = [
  'userId',
  'vehicleId',
  'bookingId',
  'mechanicId',
  'quotationReference',
  'status',
  'customerResponse',
  'customerResponseAt',
  'subtotal',
  'totalAmount',
  'approvedAt',
  'rejectedAt',
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
 * Middleware: Validate quotationId URL parameter
 */
const validateQuotationIdParam = (req, res, next) => {
  const { quotationId } = req.params;

  if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Invalid quotation ID format.',
      error: { fields: { quotationId: 'Must be a valid 24-character hexadecimal MongoDB ObjectId.' } },
    });
  }

  next();
};

/**
 * Middleware: Validate POST /api/quotations creation payload
 */
const validateCreateQuotation = (req, res, next) => {
  const errors = {};
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed: Request body must be a valid JSON object.',
      error: { fields: { body: 'Invalid JSON body' } },
    });
  }

  // 1. Detect forbidden fields
  for (const field of FORBIDDEN_CREATE_FIELDS) {
    if (field in body) {
      errors[field] = `Providing '${field}' in quotation payload is strictly prohibited. Calculated server-side.`;
    }
  }

  // 2. inspectionId
  if (!body.inspectionId || typeof body.inspectionId !== 'string') {
    errors.inspectionId = 'Inspection ID is required.';
  } else if (!mongoose.Types.ObjectId.isValid(body.inspectionId.trim())) {
    errors.inspectionId = 'Inspection ID must be a valid MongoDB ObjectId.';
  } else {
    req.body.inspectionId = body.inspectionId.trim();
  }

  // 3. items array
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.items = 'Quotation must include at least one item.';
  } else {
    const sanitizedItems = [];
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item || typeof item !== 'object') {
        errors[`items[${i}]`] = 'Each line item must be a valid object.';
        break;
      }

      // itemType
      let itemType = ITEM_TYPES.SERVICE;
      if (item.itemType) {
        const normType = String(item.itemType).toUpperCase().trim();
        if (!Object.values(ITEM_TYPES).includes(normType)) {
          errors[`items[${i}].itemType`] = `Invalid item type '${item.itemType}'. Allowed: ${Object.values(ITEM_TYPES).join(', ')}.`;
          break;
        }
        itemType = normType;
      }

      // serviceId validation if itemType is SERVICE
      let serviceId = null;
      if (itemType === ITEM_TYPES.SERVICE) {
        if (item.serviceId) {
          if (!mongoose.Types.ObjectId.isValid(String(item.serviceId).trim())) {
            errors[`items[${i}].serviceId`] = 'Service ID must be a valid MongoDB ObjectId.';
            break;
          }
          serviceId = String(item.serviceId).trim();
        }
      }

      // name
      let name = item.name ? String(item.name).trim() : '';
      if (!name && itemType !== ITEM_TYPES.SERVICE) {
        errors[`items[${i}].name`] = 'Item name is required.';
        break;
      }

      // quantity
      const qty = item.quantity !== undefined ? Number(item.quantity) : 1;
      if (isNaN(qty) || qty <= 0) {
        errors[`items[${i}].quantity`] = 'Quantity must be a positive number greater than 0.';
        break;
      }

      // unitPrice
      if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === '') {
        errors[`items[${i}].unitPrice`] = 'Unit price is required.';
        break;
      }
      const price = Number(item.unitPrice);
      if (isNaN(price) || price < 0) {
        errors[`items[${i}].unitPrice`] = 'Unit price cannot be negative.';
        break;
      }

      const discount = item.discount !== undefined ? Math.max(0, Number(item.discount) || 0) : 0;
      const taxRate = item.taxRate !== undefined ? Math.max(0, Math.min(100, Number(item.taxRate) || 0)) : 0;

      sanitizedItems.push({
        itemType,
        serviceId,
        partId: item.partId && mongoose.Types.ObjectId.isValid(String(item.partId).trim()) ? String(item.partId).trim() : null,
        name,
        description: item.description ? String(item.description).trim() : '',
        quantity: qty,
        unitPrice: price,
        discount,
        taxRate,
      });
    }
    req.body.items = sanitizedItems;
  }

  // 4. discount
  if (body.discount !== undefined && body.discount !== null) {
    if (typeof body.discount !== 'object') {
      errors.discount = 'Discount must be an object.';
    } else {
      let type = DISCOUNT_TYPES.FIXED;
      if (body.discount.type) {
        const normType = String(body.discount.type).toUpperCase().trim();
        if (!Object.values(DISCOUNT_TYPES).includes(normType)) {
          errors['discount.type'] = `Invalid discount type. Allowed: ${Object.values(DISCOUNT_TYPES).join(', ')}.`;
        } else {
          type = normType;
        }
      }

      const val = body.discount.value !== undefined ? Number(body.discount.value) : 0;
      if (isNaN(val) || val < 0) {
        errors['discount.value'] = 'Discount value cannot be negative.';
      } else if (type === DISCOUNT_TYPES.PERCENTAGE && val > QUOTATION_LIMITS.MAX_DISCOUNT_PERCENTAGE) {
        errors['discount.value'] = `Percentage discount cannot exceed ${QUOTATION_LIMITS.MAX_DISCOUNT_PERCENTAGE}%.`;
      }

      req.body.discount = { type, value: val };
    }
  }

  // 5. tax
  if (body.tax !== undefined && body.tax !== null) {
    if (typeof body.tax !== 'object') {
      errors.tax = 'Tax must be an object.';
    } else {
      const rate = body.tax.rate !== undefined ? Number(body.tax.rate) : 0;
      if (isNaN(rate) || rate < 0 || rate > QUOTATION_LIMITS.MAX_TAX_RATE) {
        errors['tax.rate'] = `Tax rate must be a valid percentage between 0 and ${QUOTATION_LIMITS.MAX_TAX_RATE}%.`;
      }
      req.body.tax = { rate };
    }
  }

  // 6. validUntil
  if (body.validUntil !== undefined && body.validUntil !== null) {
    const validUntilDate = new Date(body.validUntil);
    if (isNaN(validUntilDate.getTime())) {
      errors.validUntil = 'validUntil must be a valid Date string.';
    } else if (validUntilDate <= new Date()) {
      errors.validUntil = 'validUntil must be a future date.';
    } else {
      req.body.validUntil = validUntilDate;
    }
  }

  // 7. notes
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.notes = 'Notes must be a string.';
    } else if (body.notes.trim().length > QUOTATION_LIMITS.NOTES_MAX_LENGTH) {
      errors.notes = `Notes cannot exceed ${QUOTATION_LIMITS.NOTES_MAX_LENGTH} characters.`;
    } else {
      req.body.notes = body.notes.trim();
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

/**
 * Middleware: Validate PATCH /api/quotations/:quotationId/reject payload
 */
const validateRejectQuotation = (req, res, next) => {
  const { reason } = req.body || {};

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { reason: 'Rejection reason is required.' } },
    });
  }

  const trimmedReason = reason.trim();
  if (
    trimmedReason.length < QUOTATION_LIMITS.REASON_MIN_LENGTH ||
    trimmedReason.length > QUOTATION_LIMITS.REASON_MAX_LENGTH
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          reason: `Rejection reason must be between ${QUOTATION_LIMITS.REASON_MIN_LENGTH} and ${QUOTATION_LIMITS.REASON_MAX_LENGTH} characters.`,
        },
      },
    });
  }

  req.body.reason = trimmedReason;
  next();
};

module.exports = {
  validateBookingIdParam,
  validateQuotationIdParam,
  validateCreateQuotation,
  validateRejectQuotation,
};
