const mongoose = require('mongoose');
const { BOOKING_TYPES, BOOKING_STATUS } = require('./booking.constants');

/**
 * Booking Schema
 *
 * Represents a customer's requested vehicle servicing or roadside assistance request.
 * Decoupled from downstream Dispatch, Mechanic, Inspection, Quotation, and Invoicing flows.
 * Preserves point-in-time snapshots of address, location, vehicle, and selected service/package.
 */
const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: [true, 'Booking reference is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
      index: true,
    },
    servicePackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServicePackage',
      default: null,
      index: true,
    },
    bookingType: {
      type: String,
      enum: {
        values: Object.values(BOOKING_TYPES),
        message: '{VALUE} is not a valid booking type',
      },
      default: BOOKING_TYPES.SCHEDULED,
      required: [true, 'Booking type is required'],
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      default: null,
    },
    locationSnapshot: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      addressText: { type: String, trim: true, default: '' },
    },
    addressSnapshot: {
      fullName: { type: String, trim: true },
      phone: { type: String, trim: true },
      addressLine1: { type: String, trim: true },
      addressLine2: { type: String, trim: true, default: '' },
      landmark: { type: String, trim: true, default: '' },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
      postalCode: { type: String, trim: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    vehicleSnapshot: {
      vehicleId: { type: mongoose.Schema.Types.ObjectId },
      make: { type: String, trim: true },
      model: { type: String, trim: true },
      variant: { type: String, trim: true, default: '' },
      registrationNumber: { type: String, trim: true, uppercase: true },
      vehicleType: { type: String, trim: true },
      fuelType: { type: String, trim: true },
    },
    serviceSnapshot: {
      serviceId: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, trim: true },
      shortDescription: { type: String, trim: true, default: '' },
      category: { type: String, trim: true },
      basePrice: { type: Number },
      estimatedDuration: { type: Number },
    },
    packageSnapshot: {
      packageId: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, trim: true },
      shortDescription: { type: String, trim: true, default: '' },
      category: { type: String, trim: true },
      basePrice: { type: Number },
      estimatedDuration: { type: Number },
    },
    customerNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Customer notes cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BOOKING_STATUS),
        message: '{VALUE} is not a valid booking status',
      },
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for performant customer queries and administrative monitoring
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ scheduledAt: 1, status: 1 });
bookingSchema.index({ bookingType: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
