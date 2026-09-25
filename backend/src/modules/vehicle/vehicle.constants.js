/**
 * Vehicle Module Constants
 *
 * Defines vehicle categories, supported fuel types, transmission types,
 * vehicle lifecycle statuses, and validation boundaries.
 */

const VEHICLE_TYPES = Object.freeze({
  TWO_WHEELER: 'TWO_WHEELER',
  FOUR_WHEELER: 'FOUR_WHEELER',
});

const FUEL_TYPES = Object.freeze({
  PETROL: 'PETROL',
  DIESEL: 'DIESEL',
  CNG: 'CNG',
  ELECTRIC: 'ELECTRIC',
  HYBRID: 'HYBRID',
});

const TRANSMISSION_TYPES = Object.freeze({
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
  AMT: 'AMT',
  CVT: 'CVT',
  DCT: 'DCT',
});

const VEHICLE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

const VEHICLE_LIMITS = Object.freeze({
  MAKE_MIN_LENGTH: 2,
  MAKE_MAX_LENGTH: 50,
  MODEL_MIN_LENGTH: 1,
  MODEL_MAX_LENGTH: 50,
  VARIANT_MAX_LENGTH: 50,
  COLOR_MAX_LENGTH: 30,
  MIN_REGISTRATION_YEAR: 1980,
  MAX_REGISTRATION_YEAR_OFFSET: 1, // Current year + 1
  MIN_ODOMETER: 0,
  MAX_ODOMETER: 9999999,
  VIN_MIN_LENGTH: 11,
  VIN_MAX_LENGTH: 17,
});

module.exports = {
  VEHICLE_TYPES,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_STATUS,
  VEHICLE_LIMITS,
};
