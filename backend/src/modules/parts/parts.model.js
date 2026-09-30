const mongoose = require('mongoose');
const {
  PART_CATEGORIES,
  PART_UNITS,
  PART_STATUS,
  VEHICLE_TYPES,
} = require('./parts.constants');

/**
 * Part / Inventory Schema
 *
 * Manages physical parts, consumable fluids, and components used during vehicle services.
 * Tracks stock quantities, dynamic availability, reservations, and vehicle compatibility.
 */
const partSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
      minlength: [2, 'Part name must be at least 2 characters'],
      maxlength: [100, 'Part name cannot exceed 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    partNumber: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Part description is required'],
      trim: true,
      maxlength: [2000, 'Part description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: Object.values(PART_CATEGORIES),
        message: '{VALUE} is not a valid part category',
      },
      required: [true, 'Part category is required'],
      index: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
      index: true,
    },
    compatibleVehicleTypes: {
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
        message: 'At least one compatible vehicle type must be specified',
      },
    },
    compatibleMakes: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    compatibleModels: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    unit: {
      type: String,
      enum: {
        values: Object.values(PART_UNITS),
        message: '{VALUE} is not a valid measurement unit',
      },
      default: PART_UNITS.PIECE,
      required: [true, 'Unit of measurement is required'],
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      required: [true, 'Reserved quantity is required'],
      min: [0, 'Reserved quantity cannot be negative'],
      default: 0,
      validate: {
        validator: function (v) {
          // If both exist on document instance, check reserved <= stock
          if (this.stockQuantity !== undefined) {
            return v <= this.stockQuantity;
          }
          return true;
        },
        message: 'Reserved quantity cannot exceed total stock quantity',
      },
    },
    reorderLevel: {
      type: Number,
      default: 5,
      min: [0, 'Reorder level cannot be negative'],
    },
    supplierName: {
      type: String,
      trim: true,
      default: null,
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(PART_STATUS),
      default: PART_STATUS.ACTIVE,
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
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for calculating available quantity dynamically
partSchema.virtual('availableQuantity').get(function () {
  const stock = typeof this.stockQuantity === 'number' ? this.stockQuantity : 0;
  const reserved = typeof this.reservedQuantity === 'number' ? this.reservedQuantity : 0;
  return Math.max(0, stock - reserved);
});

// Virtual for calculating low stock flag dynamically
partSchema.virtual('isLowStock').get(function () {
  const available = this.availableQuantity !== undefined
    ? this.availableQuantity
    : Math.max(0, (this.stockQuantity || 0) - (this.reservedQuantity || 0));
  const reorder = typeof this.reorderLevel === 'number' ? this.reorderLevel : 5;
  return available <= reorder;
});

// Compound indexes for performant catalogue & inventory queries
partSchema.index({ status: 1, category: 1, brand: 1 });
partSchema.index({ compatibleVehicleTypes: 1, status: 1 });
partSchema.index({ createdAt: -1 });

// Full-text search index
partSchema.index(
  {
    name: 'text',
    sku: 'text',
    partNumber: 'text',
    brand: 'text',
    description: 'text',
  },
  {
    weights: {
      name: 10,
      sku: 8,
      partNumber: 6,
      brand: 4,
      description: 1,
    },
    name: 'PartTextIndex',
  }
);

const Part = mongoose.model('Part', partSchema);

module.exports = Part;
