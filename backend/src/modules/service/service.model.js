const mongoose = require('mongoose');
const {
  SERVICE_CATEGORIES,
  VEHICLE_TYPES,
  SERVICE_STATUS,
} = require('./service.constants');

/**
 * Service Schema
 *
 * Dedicated strictly to the individual service catalogue offerings.
 * Bundling combinations belong to Service Package, and transactional pricing/mechanic
 * assignments belong to Booking.
 */
const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      minlength: [3, 'Service name must be at least 3 characters'],
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Service slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Service description is required'],
      trim: true,
      maxlength: [2000, 'Service description cannot exceed 2000 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, 'Short description cannot exceed 200 characters'],
      default: '',
    },
    category: {
      type: String,
      enum: {
        values: Object.values(SERVICE_CATEGORIES),
        message: '{VALUE} is not a valid service category',
      },
      required: [true, 'Service category is required'],
      index: true,
    },
    vehicleTypes: {
      type: [
        {
          type: String,
          enum: {
            values: Object.values(VEHICLE_TYPES),
            message: '{VALUE} is not a valid vehicle type',
          },
        },
      ],
      default: [VEHICLE_TYPES.FOUR_WHEELER],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one vehicle type must be supported',
      },
    },
    estimatedDuration: {
      type: Number,
      required: [true, 'Estimated duration (in minutes) is required'],
      min: [1, 'Estimated duration must be at least 1 minute'],
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    isEmergency: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SERVICE_STATUS),
      default: SERVICE_STATUS.ACTIVE,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Display order cannot be negative'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

// Compound indexes for performant catalogue filtering & sorting
serviceSchema.index({ status: 1, displayOrder: 1, createdAt: -1 });
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ isEmergency: 1, status: 1 });
serviceSchema.index({ vehicleTypes: 1, status: 1 });

// Full-text search index
serviceSchema.index(
  {
    name: 'text',
    shortDescription: 'text',
    description: 'text',
  },
  {
    weights: {
      name: 10,
      shortDescription: 5,
      description: 1,
    },
    name: 'ServiceTextIndex',
  }
);

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
