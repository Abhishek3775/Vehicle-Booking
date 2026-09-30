/**
 * Parts / Inventory Module Constants
 *
 * Defines part categories, measurement units, lifecycle statuses,
 * stock operations, pagination defaults, and validation boundaries.
 */

const PART_CATEGORIES = Object.freeze({
  ENGINE: 'ENGINE',
  BRAKE: 'BRAKE',
  TRANSMISSION: 'TRANSMISSION',
  SUSPENSION: 'SUSPENSION',
  ELECTRICAL: 'ELECTRICAL',
  BATTERY: 'BATTERY',
  TYRE: 'TYRE',
  AC: 'AC',
  FILTER: 'FILTER',
  FLUID: 'FLUID',
  BODY: 'BODY',
  CLUTCH: 'CLUTCH',
  LIGHTING: 'LIGHTING',
  OTHER: 'OTHER',
});

const PART_UNITS = Object.freeze({
  PIECE: 'PIECE',
  LITRE: 'LITRE',
  SET: 'SET',
  PAIR: 'PAIR',
  BOX: 'BOX',
});

const PART_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const VEHICLE_TYPES = Object.freeze({
  TWO_WHEELER: 'TWO_WHEELER',
  FOUR_WHEELER: 'FOUR_WHEELER',
});

const STOCK_OPERATIONS = Object.freeze({
  ADD: 'ADD',
  REMOVE: 'REMOVE',
});

const PAGINATION_LIMITS = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

const PARTS_LIMITS = Object.freeze({
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  SKU_MIN_LENGTH: 3,
  SKU_MAX_LENGTH: 50,
  PART_NUMBER_MAX_LENGTH: 50,
  BRAND_MAX_LENGTH: 100,
  SUPPLIER_MAX_LENGTH: 100,
  DESC_MAX_LENGTH: 2000,
  MIN_PRICE: 0,
  MAX_PRICE: 10000000,
  MIN_QUANTITY: 0,
  MAX_QUANTITY: 1000000,
  MIN_REORDER_LEVEL: 0,
  MAX_REORDER_LEVEL: 100000,
  REASON_MIN_LENGTH: 3,
  REASON_MAX_LENGTH: 250,
});

module.exports = {
  PART_CATEGORIES,
  PART_UNITS,
  PART_STATUS,
  VEHICLE_TYPES,
  STOCK_OPERATIONS,
  PAGINATION_LIMITS,
  PARTS_LIMITS,
};
