/**
 * Quotation Module Constants
 *
 * Defines quotation lifecycle statuses, customer response states, item types,
 * discount strategies, currency defaults, and validation bounds.
 */

const QUOTATION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});

const CUSTOMER_RESPONSE = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const ITEM_TYPES = Object.freeze({
  SERVICE: 'SERVICE',
  PART: 'PART',
  LABOUR: 'LABOUR',
  OTHER: 'OTHER',
});

const DISCOUNT_TYPES = Object.freeze({
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
});

const CURRENCIES = Object.freeze({
  INR: 'INR',
  USD: 'USD',
});

const PAGINATION_LIMITS = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
});

const QUOTATION_LIMITS = Object.freeze({
  ITEM_NAME_MIN_LENGTH: 2,
  ITEM_NAME_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  REASON_MIN_LENGTH: 3,
  REASON_MAX_LENGTH: 500,
  MAX_DISCOUNT_PERCENTAGE: 100,
  MAX_TAX_RATE: 100,
  DEFAULT_VALIDITY_DAYS: 7,
});

module.exports = {
  QUOTATION_STATUS,
  CUSTOMER_RESPONSE,
  ITEM_TYPES,
  DISCOUNT_TYPES,
  CURRENCIES,
  PAGINATION_LIMITS,
  QUOTATION_LIMITS,
};
