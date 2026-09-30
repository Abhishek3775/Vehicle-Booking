const mongoose = require('mongoose');
const {
  LOCATION_SOURCES,
  LOCATION_TYPES,
  LOCATION_LIMITS,
} = require('./location.constants');

/**
 * Location Schema
 *
 * Stores geospatial coordinates, location history, and live tracking snapshots
 * for customers and service mechanics.
 * Supports MongoDB 2dsphere indexing for efficient proximity and radius searches.
 */
const locationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mechanic',
      default: null,
      index: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [LOCATION_LIMITS.MIN_LATITUDE, `Latitude must be >= ${LOCATION_LIMITS.MIN_LATITUDE}`],
      max: [LOCATION_LIMITS.MAX_LATITUDE, `Latitude must be <= ${LOCATION_LIMITS.MAX_LATITUDE}`],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [LOCATION_LIMITS.MIN_LONGITUDE, `Longitude must be >= ${LOCATION_LIMITS.MIN_LONGITUDE}`],
      max: [LOCATION_LIMITS.MAX_LONGITUDE, `Longitude must be <= ${LOCATION_LIMITS.MAX_LONGITUDE}`],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude] in accordance with GeoJSON standards
        required: true,
      },
    },
    accuracy: {
      type: Number,
      default: null,
      min: [LOCATION_LIMITS.MIN_ACCURACY, 'Accuracy cannot be negative'],
    },
    altitude: {
      type: Number,
      default: null,
    },
    heading: {
      type: Number,
      default: null,
      min: [LOCATION_LIMITS.MIN_HEADING, `Heading must be >= ${LOCATION_LIMITS.MIN_HEADING}`],
      max: [LOCATION_LIMITS.MAX_HEADING, `Heading must be <= ${LOCATION_LIMITS.MAX_HEADING}`],
    },
    speed: {
      type: Number,
      default: null,
      min: [LOCATION_LIMITS.MIN_SPEED, 'Speed cannot be negative'],
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },
    postalCode: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      enum: {
        values: Object.values(LOCATION_SOURCES),
        message: '{VALUE} is not a valid location source',
      },
      default: LOCATION_SOURCES.GPS,
    },
    locationType: {
      type: String,
      enum: {
        values: Object.values(LOCATION_TYPES),
        message: '{VALUE} is not a valid location type',
      },
      default: LOCATION_TYPES.CURRENT,
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
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

// MongoDB Geospatial Index
locationSchema.index({ location: '2dsphere' });

// Compound Indexes for fast state lookups and history sorting
locationSchema.index({ userId: 1, isCurrent: 1 });
locationSchema.index({ mechanicId: 1, isCurrent: 1 });
locationSchema.index({ userId: 1, createdAt: -1 });
locationSchema.index({ mechanicId: 1, createdAt: -1 });

// TTL index for automatic expiry of historical location logs
locationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
