/**
 * Data Formatting Utilities
 */

/**
 * Format numerical amount into Indian Rupee (INR) currency representation
 * @param {number} amount
 * @returns {string} Example: ₹12,500.00
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format ISO date string into readable Date and Time
 * @param {string|Date} dateStr
 * @returns {string} Example: 26 Sep 2026, 08:30 PM
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

/**
 * Format ISO date string into readable Date only
 * @param {string|Date} dateStr
 * @returns {string} Example: 26 Sep 2026
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

/**
 * Format relative time (e.g., "5 mins ago", "2 hours ago")
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`;
    return formatDate(dateStr);
  } catch {
    return '—';
  }
};

/**
 * Formats E.164 phone number into standard display format
 * @param {string} phone
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return '—';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+91') && clean.length === 13) {
    return `+91 ${clean.slice(3, 8)} ${clean.slice(8)}`;
  }
  return clean;
};

/**
 * Capitalizes string and replaces underscores with spaces
 * @param {string} text
 * @returns {string}
 */
export const formatStatusLabel = (text) => {
  if (!text) return '—';
  return text
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
