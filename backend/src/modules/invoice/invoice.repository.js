const Invoice = require('./invoice.model');
const { INVOICE_STATUS } = require('./invoice.constants');

/**
 * Invoice Repository Layer
 *
 * Dedicated database abstraction handling all MongoDB operations for Invoice.
 * Contains zero HTTP or business logic.
 */
class InvoiceRepository {
  /**
   * Insert a new invoice record
   * @param {object} invoiceData
   * @returns {Promise<Invoice>}
   */
  async create(invoiceData) {
    const invoice = new Invoice(invoiceData);
    return invoice.save();
  }

  /**
   * Find an invoice by its MongoDB ID
   * @param {string} id
   * @returns {Promise<Invoice|null>}
   */
  async findById(id) {
    return Invoice.findById(id).exec();
  }

  /**
   * Find an invoice by customer-facing invoice number (e.g. INV-20260926-0001)
   * @param {string} invoiceNumber
   * @returns {Promise<Invoice|null>}
   */
  async findByNumber(invoiceNumber) {
    if (!invoiceNumber) return null;
    return Invoice.findOne({ invoiceNumber: invoiceNumber.toUpperCase().trim() }).exec();
  }

  /**
   * Find an invoice by internal reference
   * @param {string} invoiceReference
   * @returns {Promise<Invoice|null>}
   */
  async findByReference(invoiceReference) {
    if (!invoiceReference) return null;
    return Invoice.findOne({ invoiceReference: invoiceReference.toUpperCase().trim() }).exec();
  }

  /**
   * Find an invoice by associated Payment ID (enforcing 1-to-1 relationship)
   * @param {string} paymentId
   * @returns {Promise<Invoice|null>}
   */
  async findByPaymentId(paymentId) {
    if (!paymentId) return null;
    return Invoice.findOne({ paymentId }).exec();
  }

  /**
   * Find all invoices associated with a booking
   * @param {string} bookingId
   * @returns {Promise<Array<Invoice>>}
   */
  async findByBookingId(bookingId) {
    return Invoice.find({ bookingId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find all invoices associated with a quotation
   * @param {string} quotationId
   * @returns {Promise<Array<Invoice>>}
   */
  async findByQuotationId(quotationId) {
    return Invoice.find({ quotationId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Query invoices with filtering, sorting, and pagination
   * @param {object} params
   * @param {object} [params.filter={}]
   * @param {object} [params.sort={ createdAt: -1 }]
   * @param {number} [params.skip=0]
   * @param {number} [params.limit=10]
   * @returns {Promise<Array<Invoice>>}
   */
  async findInvoices({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10 }) {
    return Invoice.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Count total invoices matching filter
   * @param {object} [filter={}]
   * @returns {Promise<number>}
   */
  async countInvoices(filter = {}) {
    return Invoice.countDocuments(filter).exec();
  }

  /**
   * Cancel an existing invoice
   * @param {string} id
   * @param {object} details
   * @param {string} details.cancelledBy
   * @param {string} details.cancellationReason
   * @param {Date} [details.cancelledAt=new Date()]
   * @returns {Promise<Invoice|null>}
   */
  async cancelInvoice(id, { cancelledBy, cancellationReason, cancelledAt = new Date() }) {
    return Invoice.findByIdAndUpdate(
      id,
      {
        $set: {
          invoiceStatus: INVOICE_STATUS.CANCELLED,
          cancelledBy,
          cancellationReason,
          cancelledAt,
        },
      },
      { new: true }
    ).exec();
  }
}

module.exports = new InvoiceRepository();
