const mongoose = require('mongoose');
const {
  PART_CATEGORIES,
  PART_UNITS,
  PART_STATUS,
  VEHICLE_TYPES,
  STOCK_OPERATIONS,
  PARTS_LIMITS,
} = require('./parts.constants');

// Forbidden fields that cannot be directly passed via client payload
const FORBIDDEN_FIELDS = ['createdBy', 'updatedBy', '_id', 'id', 'createdAt', 'updatedAt'];

// Fields protected from generic PUT update (stock changes have dedicated endpoint)
const UPDATE_FORBIDDEN_FIELDS = [
  ...FORBIDDEN_FIELDS,
  'reservedQuantity',
  'stockQuantity',
];

/**
 * Middleware: Validate POST /api/parts payload
 */
const validateCreatePart = (req, res, next) => {
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
  for (const field of FORBIDDEN_FIELDS) {
    if (field in body) {
      errors[field] = `Providing '${field}' in request body is strictly prohibited.`;
    }
  }

  // 2. name
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.name = 'Part name is required.';
  } else {
    const trimmed = body.name.trim();
    if (trimmed.length < PARTS_LIMITS.NAME_MIN_LENGTH || trimmed.length > PARTS_LIMITS.NAME_MAX_LENGTH) {
      errors.name = `Part name must be between ${PARTS_LIMITS.NAME_MIN_LENGTH} and ${PARTS_LIMITS.NAME_MAX_LENGTH} characters.`;
    }
  }

  // 3. sku
  if (!body.sku || typeof body.sku !== 'string' || !body.sku.trim()) {
    errors.sku = 'SKU is required.';
  } else {
    const normalizedSku = body.sku.toUpperCase().trim();
    if (normalizedSku.length < PARTS_LIMITS.SKU_MIN_LENGTH || normalizedSku.length > PARTS_LIMITS.SKU_MAX_LENGTH) {
      errors.sku = `SKU must be between ${PARTS_LIMITS.SKU_MIN_LENGTH} and ${PARTS_LIMITS.SKU_MAX_LENGTH} characters.`;
    } else {
      req.body.sku = normalizedSku;
    }
  }

  // 4. partNumber
  if (body.partNumber !== undefined && body.partNumber !== null) {
    if (typeof body.partNumber !== 'string') {
      errors.partNumber = 'Part number must be a string.';
    } else if (body.partNumber.trim().length > PARTS_LIMITS.PART_NUMBER_MAX_LENGTH) {
      errors.partNumber = `Part number cannot exceed ${PARTS_LIMITS.PART_NUMBER_MAX_LENGTH} characters.`;
    } else {
      req.body.partNumber = body.partNumber.trim() || null;
    }
  }

  // 5. description
  if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
    errors.description = 'Part description is required.';
  } else if (body.description.trim().length > PARTS_LIMITS.DESC_MAX_LENGTH) {
    errors.description = `Part description cannot exceed ${PARTS_LIMITS.DESC_MAX_LENGTH} characters.`;
  }

  // 6. category
  if (!body.category || typeof body.category !== 'string') {
    errors.category = 'Part category is required.';
  } else {
    const normalizedCategory = body.category.toUpperCase().trim();
    if (!Object.values(PART_CATEGORIES).includes(normalizedCategory)) {
      errors.category = `Invalid category. Allowed values: ${Object.values(PART_CATEGORIES).join(', ')}.`;
    } else {
      req.body.category = normalizedCategory;
    }
  }

  // 7. brand
  if (!body.brand || typeof body.brand !== 'string' || !body.brand.trim()) {
    errors.brand = 'Brand name is required.';
  } else if (body.brand.trim().length > PARTS_LIMITS.BRAND_MAX_LENGTH) {
    errors.brand = `Brand name cannot exceed ${PARTS_LIMITS.BRAND_MAX_LENGTH} characters.`;
  }

  // 8. compatibleVehicleTypes
  if (body.compatibleVehicleTypes !== undefined && body.compatibleVehicleTypes !== null) {
    if (!Array.isArray(body.compatibleVehicleTypes) || body.compatibleVehicleTypes.length === 0) {
      errors.compatibleVehicleTypes = 'compatibleVehicleTypes must be a non-empty array of vehicle types.';
    } else {
      const normalizedTypes = [];
      for (const vt of body.compatibleVehicleTypes) {
        if (typeof vt !== 'string' || !Object.values(VEHICLE_TYPES).includes(vt.toUpperCase().trim())) {
          errors.compatibleVehicleTypes = `Invalid vehicle type '${vt}'. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
          break;
        }
        normalizedTypes.push(vt.toUpperCase().trim());
      }
      req.body.compatibleVehicleTypes = [...new Set(normalizedTypes)];
    }
  }

  // 9. compatibleMakes & compatibleModels
  if (body.compatibleMakes !== undefined && body.compatibleMakes !== null) {
    if (!Array.isArray(body.compatibleMakes)) {
      errors.compatibleMakes = 'compatibleMakes must be an array of strings.';
    } else {
      req.body.compatibleMakes = body.compatibleMakes
        .filter((m) => typeof m === 'string' && m.trim())
        .map((m) => m.trim());
    }
  }

  if (body.compatibleModels !== undefined && body.compatibleModels !== null) {
    if (!Array.isArray(body.compatibleModels)) {
      errors.compatibleModels = 'compatibleModels must be an array of strings.';
    } else {
      req.body.compatibleModels = body.compatibleModels
        .filter((m) => typeof m === 'string' && m.trim())
        .map((m) => m.trim());
    }
  }

  // 10. unit
  if (body.unit !== undefined && body.unit !== null) {
    if (typeof body.unit !== 'string') {
      errors.unit = 'Unit must be a string.';
    } else {
      const normalizedUnit = body.unit.toUpperCase().trim();
      if (!Object.values(PART_UNITS).includes(normalizedUnit)) {
        errors.unit = `Invalid unit. Allowed values: ${Object.values(PART_UNITS).join(', ')}.`;
      } else {
        req.body.unit = normalizedUnit;
      }
    }
  }

  // 11. costPrice
  if (body.costPrice === undefined || body.costPrice === null || body.costPrice === '') {
    errors.costPrice = 'Cost price is required.';
  } else {
    const cp = Number(body.costPrice);
    if (isNaN(cp) || cp < PARTS_LIMITS.MIN_PRICE || cp > PARTS_LIMITS.MAX_PRICE) {
      errors.costPrice = `Cost price must be a valid number between ${PARTS_LIMITS.MIN_PRICE} and ${PARTS_LIMITS.MAX_PRICE}.`;
    }
  }

  // 12. sellingPrice
  if (body.sellingPrice === undefined || body.sellingPrice === null || body.sellingPrice === '') {
    errors.sellingPrice = 'Selling price is required.';
  } else {
    const sp = Number(body.sellingPrice);
    if (isNaN(sp) || sp < PARTS_LIMITS.MIN_PRICE || sp > PARTS_LIMITS.MAX_PRICE) {
      errors.sellingPrice = `Selling price must be a valid number between ${PARTS_LIMITS.MIN_PRICE} and ${PARTS_LIMITS.MAX_PRICE}.`;
    }
  }

  // 13. stockQuantity
  let stockQty = 0;
  if (body.stockQuantity !== undefined && body.stockQuantity !== null) {
    const sq = Number(body.stockQuantity);
    if (isNaN(sq) || !Number.isInteger(sq) || sq < PARTS_LIMITS.MIN_QUANTITY || sq > PARTS_LIMITS.MAX_QUANTITY) {
      errors.stockQuantity = `Stock quantity must be an integer between ${PARTS_LIMITS.MIN_QUANTITY} and ${PARTS_LIMITS.MAX_QUANTITY}.`;
    } else {
      stockQty = sq;
    }
  }

  // 14. reservedQuantity
  if (body.reservedQuantity !== undefined && body.reservedQuantity !== null) {
    const rq = Number(body.reservedQuantity);
    if (isNaN(rq) || !Number.isInteger(rq) || rq < PARTS_LIMITS.MIN_QUANTITY || rq > stockQty) {
      errors.reservedQuantity = `Reserved quantity must be an integer between 0 and stock quantity (${stockQty}).`;
    }
  }

  // 15. reorderLevel
  if (body.reorderLevel !== undefined && body.reorderLevel !== null) {
    const rl = Number(body.reorderLevel);
    if (isNaN(rl) || !Number.isInteger(rl) || rl < PARTS_LIMITS.MIN_REORDER_LEVEL || rl > PARTS_LIMITS.MAX_REORDER_LEVEL) {
      errors.reorderLevel = `Reorder level must be a non-negative integer.`;
    }
  }

  // 16. supplierName
  if (body.supplierName !== undefined && body.supplierName !== null) {
    if (typeof body.supplierName !== 'string') {
      errors.supplierName = 'Supplier name must be a string.';
    } else if (body.supplierName.trim().length > PARTS_LIMITS.SUPPLIER_MAX_LENGTH) {
      errors.supplierName = `Supplier name cannot exceed ${PARTS_LIMITS.SUPPLIER_MAX_LENGTH} characters.`;
    } else {
      req.body.supplierName = body.supplierName.trim() || null;
    }
  }

  // 17. image
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') {
      errors.image = 'Image must be a string URL.';
    }
  }

  // 18. status
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string') {
      errors.status = 'Status must be a string.';
    } else {
      const normalizedStatus = body.status.toUpperCase().trim();
      if (!Object.values(PART_STATUS).includes(normalizedStatus)) {
        errors.status = `Invalid status. Allowed values: ${Object.values(PART_STATUS).join(', ')}.`;
      } else {
        req.body.status = normalizedStatus;
      }
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
 * Middleware: Validate PUT /api/parts/:partId payload
 */
const validateUpdatePart = (req, res, next) => {
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
  for (const field of UPDATE_FORBIDDEN_FIELDS) {
    if (field in body) {
      errors[field] = `Modifying '${field}' via this endpoint is strictly prohibited. Use dedicated inventory operations for stock changes.`;
    }
  }

  // 2. name
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.name = 'Part name cannot be empty.';
    } else {
      const trimmed = body.name.trim();
      if (trimmed.length < PARTS_LIMITS.NAME_MIN_LENGTH || trimmed.length > PARTS_LIMITS.NAME_MAX_LENGTH) {
        errors.name = `Part name must be between ${PARTS_LIMITS.NAME_MIN_LENGTH} and ${PARTS_LIMITS.NAME_MAX_LENGTH} characters.`;
      }
    }
  }

  // 3. partNumber
  if (body.partNumber !== undefined && body.partNumber !== null) {
    if (typeof body.partNumber !== 'string') {
      errors.partNumber = 'Part number must be a string.';
    } else if (body.partNumber.trim().length > PARTS_LIMITS.PART_NUMBER_MAX_LENGTH) {
      errors.partNumber = `Part number cannot exceed ${PARTS_LIMITS.PART_NUMBER_MAX_LENGTH} characters.`;
    } else {
      req.body.partNumber = body.partNumber.trim() || null;
    }
  }

  // 4. description
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || !body.description.trim()) {
      errors.description = 'Part description cannot be empty.';
    } else if (body.description.trim().length > PARTS_LIMITS.DESC_MAX_LENGTH) {
      errors.description = `Part description cannot exceed ${PARTS_LIMITS.DESC_MAX_LENGTH} characters.`;
    }
  }

  // 5. category
  if (body.category !== undefined) {
    if (typeof body.category !== 'string') {
      errors.category = 'Part category must be a string.';
    } else {
      const normalizedCategory = body.category.toUpperCase().trim();
      if (!Object.values(PART_CATEGORIES).includes(normalizedCategory)) {
        errors.category = `Invalid category. Allowed values: ${Object.values(PART_CATEGORIES).join(', ')}.`;
      } else {
        req.body.category = normalizedCategory;
      }
    }
  }

  // 6. brand
  if (body.brand !== undefined) {
    if (typeof body.brand !== 'string' || !body.brand.trim()) {
      errors.brand = 'Brand name cannot be empty.';
    } else if (body.brand.trim().length > PARTS_LIMITS.BRAND_MAX_LENGTH) {
      errors.brand = `Brand name cannot exceed ${PARTS_LIMITS.BRAND_MAX_LENGTH} characters.`;
    }
  }

  // 7. compatibleVehicleTypes
  if (body.compatibleVehicleTypes !== undefined && body.compatibleVehicleTypes !== null) {
    if (!Array.isArray(body.compatibleVehicleTypes) || body.compatibleVehicleTypes.length === 0) {
      errors.compatibleVehicleTypes = 'compatibleVehicleTypes must be a non-empty array of vehicle types.';
    } else {
      const normalizedTypes = [];
      for (const vt of body.compatibleVehicleTypes) {
        if (typeof vt !== 'string' || !Object.values(VEHICLE_TYPES).includes(vt.toUpperCase().trim())) {
          errors.compatibleVehicleTypes = `Invalid vehicle type '${vt}'. Allowed values: ${Object.values(VEHICLE_TYPES).join(', ')}.`;
          break;
        }
        normalizedTypes.push(vt.toUpperCase().trim());
      }
      req.body.compatibleVehicleTypes = [...new Set(normalizedTypes)];
    }
  }

  // 8. compatibleMakes & compatibleModels
  if (body.compatibleMakes !== undefined && body.compatibleMakes !== null) {
    if (!Array.isArray(body.compatibleMakes)) {
      errors.compatibleMakes = 'compatibleMakes must be an array of strings.';
    } else {
      req.body.compatibleMakes = body.compatibleMakes
        .filter((m) => typeof m === 'string' && m.trim())
        .map((m) => m.trim());
    }
  }

  if (body.compatibleModels !== undefined && body.compatibleModels !== null) {
    if (!Array.isArray(body.compatibleModels)) {
      errors.compatibleModels = 'compatibleModels must be an array of strings.';
    } else {
      req.body.compatibleModels = body.compatibleModels
        .filter((m) => typeof m === 'string' && m.trim())
        .map((m) => m.trim());
    }
  }

  // 9. unit
  if (body.unit !== undefined) {
    if (typeof body.unit !== 'string') {
      errors.unit = 'Unit must be a string.';
    } else {
      const normalizedUnit = body.unit.toUpperCase().trim();
      if (!Object.values(PART_UNITS).includes(normalizedUnit)) {
        errors.unit = `Invalid unit. Allowed values: ${Object.values(PART_UNITS).join(', ')}.`;
      } else {
        req.body.unit = normalizedUnit;
      }
    }
  }

  // 10. costPrice
  if (body.costPrice !== undefined) {
    const cp = Number(body.costPrice);
    if (isNaN(cp) || cp < PARTS_LIMITS.MIN_PRICE || cp > PARTS_LIMITS.MAX_PRICE) {
      errors.costPrice = `Cost price must be a valid number between ${PARTS_LIMITS.MIN_PRICE} and ${PARTS_LIMITS.MAX_PRICE}.`;
    }
  }

  // 11. sellingPrice
  if (body.sellingPrice !== undefined) {
    const sp = Number(body.sellingPrice);
    if (isNaN(sp) || sp < PARTS_LIMITS.MIN_PRICE || sp > PARTS_LIMITS.MAX_PRICE) {
      errors.sellingPrice = `Selling price must be a valid number between ${PARTS_LIMITS.MIN_PRICE} and ${PARTS_LIMITS.MAX_PRICE}.`;
    }
  }

  // 12. reorderLevel
  if (body.reorderLevel !== undefined) {
    const rl = Number(body.reorderLevel);
    if (isNaN(rl) || !Number.isInteger(rl) || rl < PARTS_LIMITS.MIN_REORDER_LEVEL || rl > PARTS_LIMITS.MAX_REORDER_LEVEL) {
      errors.reorderLevel = `Reorder level must be a non-negative integer.`;
    }
  }

  // 13. supplierName
  if (body.supplierName !== undefined && body.supplierName !== null) {
    if (typeof body.supplierName !== 'string') {
      errors.supplierName = 'Supplier name must be a string.';
    } else if (body.supplierName.trim().length > PARTS_LIMITS.SUPPLIER_MAX_LENGTH) {
      errors.supplierName = `Supplier name cannot exceed ${PARTS_LIMITS.SUPPLIER_MAX_LENGTH} characters.`;
    } else {
      req.body.supplierName = body.supplierName.trim() || null;
    }
  }

  // 14. image
  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') {
      errors.image = 'Image must be a string URL.';
    }
  }

  // 15. status
  if (body.status !== undefined) {
    if (typeof body.status !== 'string') {
      errors.status = 'Status must be a string.';
    } else {
      const normalizedStatus = body.status.toUpperCase().trim();
      if (!Object.values(PART_STATUS).includes(normalizedStatus)) {
        errors.status = `Invalid status. Allowed values: ${Object.values(PART_STATUS).join(', ')}.`;
      } else {
        req.body.status = normalizedStatus;
      }
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
 * Middleware: Validate PATCH /api/parts/:partId/status payload
 */
const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body || {};

  if (!status || typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { status: 'Status is required.' } },
    });
  }

  const normalizedStatus = status.toUpperCase().trim();
  if (!Object.values(PART_STATUS).includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        fields: {
          status: `Invalid status. Allowed values: ${Object.values(PART_STATUS).join(', ')}.`,
        },
      },
    });
  }

  req.body.status = normalizedStatus;
  next();
};

/**
 * Middleware: Validate PATCH /api/parts/:partId/stock payload
 */
const validateStockAdjustment = (req, res, next) => {
  const errors = {};
  const { quantity, operation, reason } = req.body || {};

  // 1. quantity
  if (quantity === undefined || quantity === null || quantity === '') {
    errors.quantity = 'Stock adjustment quantity is required.';
  } else {
    const q = Number(quantity);
    if (isNaN(q) || !Number.isInteger(q) || q <= 0 || q > PARTS_LIMITS.MAX_QUANTITY) {
      errors.quantity = `Adjustment quantity must be a positive integer between 1 and ${PARTS_LIMITS.MAX_QUANTITY}.`;
    }
  }

  // 2. operation
  if (!operation || typeof operation !== 'string') {
    errors.operation = 'Stock operation is required.';
  } else {
    const normalizedOp = operation.toUpperCase().trim();
    if (!Object.values(STOCK_OPERATIONS).includes(normalizedOp)) {
      errors.operation = `Invalid stock operation. Allowed values: ${Object.values(STOCK_OPERATIONS).join(', ')}.`;
    } else {
      req.body.operation = normalizedOp;
    }
  }

  // 3. reason
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    errors.reason = 'Reason for stock adjustment is required.';
  } else if (reason.trim().length < PARTS_LIMITS.REASON_MIN_LENGTH || reason.trim().length > PARTS_LIMITS.REASON_MAX_LENGTH) {
    errors.reason = `Reason must be between ${PARTS_LIMITS.REASON_MIN_LENGTH} and ${PARTS_LIMITS.REASON_MAX_LENGTH} characters.`;
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
 * Middleware: Validate PATCH /api/parts/:partId/reserve payload
 */
const validateStockReservation = (req, res, next) => {
  const { quantity } = req.body || {};

  if (quantity === undefined || quantity === null || quantity === '') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { quantity: 'Reservation quantity is required.' } },
    });
  }

  const q = Number(quantity);
  if (isNaN(q) || !Number.isInteger(q) || q <= 0 || q > PARTS_LIMITS.MAX_QUANTITY) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { quantity: 'Reservation quantity must be a positive integer.' } },
    });
  }

  req.body.quantity = q;
  next();
};

/**
 * Middleware: Validate PATCH /api/parts/:partId/release payload
 */
const validateStockRelease = (req, res, next) => {
  const { quantity } = req.body || {};

  if (quantity === undefined || quantity === null || quantity === '') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { quantity: 'Release quantity is required.' } },
    });
  }

  const q = Number(quantity);
  if (isNaN(q) || !Number.isInteger(q) || q <= 0 || q > PARTS_LIMITS.MAX_QUANTITY) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: { fields: { quantity: 'Release quantity must be a positive integer.' } },
    });
  }

  req.body.quantity = q;
  next();
};

module.exports = {
  validateCreatePart,
  validateUpdatePart,
  validateUpdateStatus,
  validateStockAdjustment,
  validateStockReservation,
  validateStockRelease,
};
