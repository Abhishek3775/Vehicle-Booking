/**
 * User Module Constants
 *
 * Defines account lifecycle statuses, supported gender values,
 * default preferences, and profile field validation limits.
 */

const USER_ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  DEACTIVATED: 'DEACTIVATED',
  BLOCKED: 'BLOCKED',
  SUSPENDED: 'SUSPENDED',
});

const GENDERS = Object.freeze({
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  PREFER_NOT_TO_SAY: 'prefer_not_to_say',
});

const DEFAULT_PREFERENCES = Object.freeze({
  notifications: {
    email: true,
    sms: true,
    push: true,
  },
  language: 'en',
  theme: 'light',
});

const PROFILE_LIMITS = Object.freeze({
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  IMAGE_URL_MAX_LENGTH: 2048,
  MIN_AGE_YEARS: 13,
  MAX_AGE_YEARS: 120,
});

module.exports = {
  USER_ACCOUNT_STATUS,
  GENDERS,
  DEFAULT_PREFERENCES,
  PROFILE_LIMITS,
};
