/**
 * Authentication Module Constants
 *
 * Defines user roles, account lifecycle statuses, and OTP/token configuration values.
 */

const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  MECHANIC: 'MECHANIC',
  ADMIN: 'ADMIN',
});

const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  DEACTIVATED: 'DEACTIVATED',
  BLOCKED: 'BLOCKED',
  SUSPENDED: 'SUSPENDED',
});

const OTP_CONFIG = Object.freeze({
  LENGTH: 6,
  DEFAULT_EXPIRY_MINUTES: 5,
  DEFAULT_RESEND_COOLDOWN_SECONDS: 60,
  DEFAULT_MAX_REQUESTS: 5,
  DEFAULT_WINDOW_MINUTES: 10,
  MAX_VERIFY_ATTEMPTS: 5,
});

const TOKEN_TYPES = Object.freeze({
  ACCESS: 'ACCESS',
  REFRESH: 'REFRESH',
});

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  OTP_CONFIG,
  TOKEN_TYPES,
};
