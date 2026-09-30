/**
 * Location Module Constants
 *
 * Defines coordinate boundaries, location sources, location types,
 * radius boundaries, update thresholds, and pagination limits.
 */

const LOCATION_SOURCES = Object.freeze({
  GPS: 'GPS',
  NETWORK: 'NETWORK',
  MANUAL: 'MANUAL',
  MAP: 'MAP',
  OTHER: 'OTHER',
});

const LOCATION_TYPES = Object.freeze({
  CURRENT: 'CURRENT',
  HISTORY: 'HISTORY',
});

const LOCATION_LIMITS = Object.freeze({
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
  MIN_ACCURACY: 0,
  MIN_HEADING: 0,
  MAX_HEADING: 360,
  MIN_SPEED: 0,
  DEFAULT_RADIUS_KM: 10,
  MIN_RADIUS_KM: 0.1,
  MAX_RADIUS_KM: 100,
  MIN_UPDATE_INTERVAL_MS: 3000, // 3 seconds
  MIN_DISTANCE_THRESHOLD_METERS: 5, // 5 meters
  HISTORY_RETENTION_DAYS: 30, // 30 days retention for location history
});

const PAGINATION_LIMITS = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
});

module.exports = {
  LOCATION_SOURCES,
  LOCATION_TYPES,
  LOCATION_LIMITS,
  PAGINATION_LIMITS,
};
