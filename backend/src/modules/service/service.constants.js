/**
 * Service Module Constants
 *
 * Defines service categories, vehicle applicability, lifecycle statuses,
 * pagination defaults, and validation boundaries.
 */

const SERVICE_CATEGORIES = Object.freeze({
  GENERAL_SERVICE: 'GENERAL_SERVICE',
  PERIODIC_SERVICE: 'PERIODIC_SERVICE',
  ENGINE: 'ENGINE',
  BRAKE: 'BRAKE',
  AC: 'AC',
  BATTERY: 'BATTERY',
  TYRE: 'TYRE',
  ELECTRICAL: 'ELECTRICAL',
  DIAGNOSTICS: 'DIAGNOSTICS',
  WASHING: 'WASHING',
  ROADSIDE_ASSISTANCE: 'ROADSIDE_ASSISTANCE',
  OTHER: 'OTHER',
});

const VEHICLE_TYPES = Object.freeze({
  TWO_WHEELER: 'TWO_WHEELER',
  FOUR_WHEELER: 'FOUR_WHEELER',
});

const SERVICE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const PAGINATION_LIMITS = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

const SERVICE_LIMITS = Object.freeze({
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  SHORT_DESC_MAX_LENGTH: 200,
  DESC_MAX_LENGTH: 2000,
  MIN_PRICE: 0,
  MAX_PRICE: 1000000,
  MIN_DURATION: 1,
  MAX_DURATION: 1440, // 24 hours in minutes
  MIN_DISPLAY_ORDER: 0,
});

module.exports = {
  SERVICE_CATEGORIES,
  VEHICLE_TYPES,
  SERVICE_STATUS,
  PAGINATION_LIMITS,
  SERVICE_LIMITS,
};
