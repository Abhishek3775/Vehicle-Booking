const mongoose = require('mongoose');
const {
  ADDRESS_LABELS,
  ADDRESS_TYPES,
  ADDRESS_STATUS,
} = require('./address.constants');

/**
 * Address Schema
 *
 * Dedicated strictly to user saved addresses, delivery/pickup location details,
 * and recipient contact information.
 * Real-time geolocation tracking and map calculation belong to the Location module.
 */
const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    label: {
      type: String,
      enum: {
        values: Object.values(ADDRESS_LABELS),
        message: '{VALUE} is not a valid address label',
      },
      default: ADDRESS_LABELS.HOME,
      required: [true, 'Address label is required'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
      maxlength: [150, 'Address line 1 cannot exceed 150 characters'],
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [150, 'Address line 2 cannot exceed 150 characters'],
      default: '',
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [100, 'Landmark cannot exceed 100 characters'],
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters'],
      default: 'India',
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    addressType: {
      type: String,
      enum: {
        values: Object.values(ADDRESS_TYPES),
        message: '{VALUE} is not a valid address type',
      },
      default: ADDRESS_TYPES.RESIDENTIAL,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(ADDRESS_STATUS),
      default: ADDRESS_STATUS.ACTIVE,
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
addressSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'userId',
  justOne: true,
});

// Secondary compound indexes for performant queries
addressSchema.index({ userId: 1, status: 1 });
addressSchema.index({ userId: 1, isDefault: 1 });

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
