const mongoose = require('mongoose');
const {
  PACKAGE_STATUS,
  VEHICLE_TYPES,
  PACKAGE_CATEGORIES,
} = require('./servicePackage.constants');

/**
 * Service Package Schema
 *
 * Represents a combination of multiple individual Services offered together as a bundled package.
 * References existing Service documents by ObjectId without duplicating service records.
 */
const servicePackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service package name is required'],
      trim: true,
      minlength: [3, 'Service package name must be at least 3 characters'],
      maxlength: [100, 'Service package name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Service package slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Service package description is required'],
      trim: true,
      maxlength: [2000, 'Service package description cannot exceed 2000 characters'],
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
        values: Object.values(PACKAGE_CATEGORIES),
        message: '{VALUE} is not a valid package category',
      },
      default: PACKAGE_CATEGORIES.PERIODIC_MAINTENANCE,
      index: true,
    },
    services: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
          required: [true, 'Referenced service ID is required'],
        },
      ],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A service package must include at least one service reference',
      },
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
        message: 'At least one vehicle type must be supported by the package',
      },
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    estimatedDuration: {
      type: Number,
      required: [true, 'Estimated duration (in minutes) is required'],
      min: [1, 'Estimated duration must be at least 1 minute'],
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    benefits: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [250, 'Benefit description cannot exceed 250 characters'],
        },
      ],
      default: [],
    },
    isPopular: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Display order cannot be negative'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PACKAGE_STATUS),
      default: PACKAGE_STATUS.ACTIVE,
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

// Compound indexes for performant querying, catalogue filtering, and sorting
servicePackageSchema.index({ status: 1, displayOrder: 1, createdAt: -1 });
servicePackageSchema.index({ vehicleTypes: 1, status: 1 });
servicePackageSchema.index({ isPopular: 1, status: 1 });
servicePackageSchema.index({ category: 1, status: 1 });

// Full-text search index
servicePackageSchema.index(
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
    name: 'ServicePackageTextIndex',
  }
);

const ServicePackage = mongoose.model('ServicePackage', servicePackageSchema);

module.exports = ServicePackage;
