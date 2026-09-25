const mongoose = require('mongoose');
const {
  VEHICLE_TYPES,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_STATUS,
} = require('./vehicle.constants');

/**
 * Vehicle Schema
 *
 * Dedicated strictly to vehicle specifications, identification,
 * ownership reference, and lifecycle status.
 * Booking, service packages, and maintenance history are decoupled.
 */
const vehicleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    vehicleType: {
      type: String,
      enum: {
        values: Object.values(VEHICLE_TYPES),
        message: '{VALUE} is not a valid vehicle type',
      },
      required: [true, 'Vehicle type is required'],
    },
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
      maxlength: [50, 'Make cannot exceed 50 characters'],
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
      maxlength: [50, 'Model cannot exceed 50 characters'],
    },
    variant: {
      type: String,
      trim: true,
      maxlength: [50, 'Variant cannot exceed 50 characters'],
      default: '',
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true,
      uppercase: true,
    },
    registrationYear: {
      type: Number,
      required: [true, 'Registration year is required'],
    },
    fuelType: {
      type: String,
      enum: {
        values: Object.values(FUEL_TYPES),
        message: '{VALUE} is not a valid fuel type',
      },
      required: [true, 'Fuel type is required'],
    },
    transmission: {
      type: String,
      enum: {
        values: [...Object.values(TRANSMISSION_TYPES), null],
        message: '{VALUE} is not a valid transmission type',
      },
      default: null,
    },
    color: {
      type: String,
      trim: true,
      maxlength: [30, 'Color cannot exceed 30 characters'],
      default: '',
    },
    vinNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    odometerReading: {
      type: Number,
      min: [0, 'Odometer reading cannot be negative'],
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(VEHICLE_STATUS),
      default: VEHICLE_STATUS.ACTIVE,
      index: true,
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
      virtuals: true,
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
      virtuals: true,
    },
  }
);

// Virtual relationship to User model
vehicleSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'userId',
  justOne: true,
});

// Secondary compound indexes
vehicleSchema.index({ userId: 1, status: 1 });
vehicleSchema.index({ userId: 1, isDefault: 1 });

// Ensure only one ACTIVE vehicle exists across the platform per registration number
vehicleSchema.index(
  { registrationNumber: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: VEHICLE_STATUS.ACTIVE },
  }
);

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
