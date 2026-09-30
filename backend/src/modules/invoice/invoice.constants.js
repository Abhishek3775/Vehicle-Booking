/**
 * Invoice Module Constants
 *
 * Defines invoice lifecycle statuses, payment settlement states,
 * currency choices, item types, pagination defaults, and validation limits.
 */

const INVOICE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  CANCELLED: 'CANCELLED',
});

const INVOICE_PAYMENT_STATUS = Object.freeze({
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  UNPAID: 'UNPAID',
});

const CURRENCIES = Object.freeze({
  INR: 'INR',
  USD: 'USD',
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

const ALLOWED_INVOICE_STATUS_TRANSITIONS = Object.freeze({
  [INVOICE_STATUS.DRAFT]: [INVOICE_STATUS.ISSUED, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.ISSUED]: [INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.CANCELLED]: [],
});

const PAGINATION_LIMITS = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
});

const INVOICE_LIMITS = Object.freeze({
  NOTES_MAX_LENGTH: 1000,
  REASON_MIN_LENGTH: 3,
  REASON_MAX_LENGTH: 500,
});

module.exports = {
  INVOICE_STATUS,
  INVOICE_PAYMENT_STATUS,
  CURRENCIES,
  ITEM_TYPES,
  DISCOUNT_TYPES,
  ALLOWED_INVOICE_STATUS_TRANSITIONS,
  PAGINATION_LIMITS,
  INVOICE_LIMITS,
};
