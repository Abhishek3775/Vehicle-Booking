const mongoose = require('mongoose');
const {
  AVAILABILITY_STATUS,
  WORK_STATUS,
  VERIFICATION_STATUS,
  VEHICLE_TYPES,
  SPECIALIZATIONS,
  MECHANIC_LIMITS,
} = require('./mechanic.constants');



/**
 * Mechanic Schema
 *
 * Stores service professional profiles, availability, skills, vehicle compatibility,
 * operational location, and verification states.
 */
const mechanicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      unique: true,
      index: true,
    },
    mechanicCode: {
      type: String,
      required: [true, 'Mechanic code is required'],
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [MECHANIC_LIMITS.DISPLAY_NAME_MIN_LENGTH, `Display name must be at least ${MECHANIC_LIMITS.DISPLAY_NAME_MIN_LENGTH} characters`],
      maxlength: [MECHANIC_LIMITS.DISPLAY_NAME_MAX_LENGTH, `Display name cannot exceed ${MECHANIC_LIMITS.DISPLAY_NAME_MAX_LENGTH} characters`],
    },
    profileImage: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: [MECHANIC_LIMITS.MIN_EXPERIENCE_YEARS, `Experience years cannot be less than ${MECHANIC_LIMITS.MIN_EXPERIENCE_YEARS}`],
      max: [MECHANIC_LIMITS.MAX_EXPERIENCE_YEARS, `Experience years cannot exceed ${MECHANIC_LIMITS.MAX_EXPERIENCE_YEARS}`],
    },
    specialization: {
      type: String,
      enum: {
        values: Object.values(SPECIALIZATIONS),
        message: '{VALUE} is not a valid specialization',
      },
      default: SPECIALIZATIONS.GENERAL_SERVICE,
    },
    skills: {
      type: [String],
      default: [],
    },
    supportedVehicleTypes: {
      type: [
        {
          type: String,
          enum: {
            values: Object.values(VEHICLE_TYPES),
            message: '{VALUE} is not a valid vehicle type',
          },
        },
      ],
      default: [VEHICLE_TYPES.TWO_WHEELER, VEHICLE_TYPES.FOUR_WHEELER],
    },
    supportedServiceIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
        },
      ],
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: {
        values: Object.values(AVAILABILITY_STATUS),
        message: '{VALUE} is not a valid availability status',
      },
      default: AVAILABILITY_STATUS.OFFLINE,
      index: true,
    },
    workStatus: {
      type: String,
      enum: {
        values: Object.values(WORK_STATUS),
        message: '{VALUE} is not a valid work status',
      },
      default: WORK_STATUS.IDLE,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: {
        values: Object.values(VERIFICATION_STATUS),
        message: '{VALUE} is not a valid verification status',
      },
      default: VERIFICATION_STATUS.PENDING,
      index: true,
    },
    currentLocation: {
      latitude: {
        type: Number,
        min: [MECHANIC_LIMITS.MIN_LATITUDE, 'Latitude must be >= -90'],
        max: [MECHANIC_LIMITS.MAX_LATITUDE, 'Latitude must be <= 90'],
        default: null,
      },
      longitude: {
        type: Number,
        min: [MECHANIC_LIMITS.MIN_LONGITUDE, 'Longitude must be >= -180'],
        max: [MECHANIC_LIMITS.MAX_LONGITUDE, 'Longitude must be <= 180'],
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    serviceRadius: {
      type: Number,
      default: MECHANIC_LIMITS.DEFAULT_SERVICE_RADIUS,
      min: [MECHANIC_LIMITS.MIN_SERVICE_RADIUS, `Service radius must be at least ${MECHANIC_LIMITS.MIN_SERVICE_RADIUS} km`],
      max: [MECHANIC_LIMITS.MAX_SERVICE_RADIUS, `Service radius cannot exceed ${MECHANIC_LIMITS.MAX_SERVICE_RADIUS} km`],
    },
    ratingSummary: {
      averageRating: {
        type: Number,
        min: [0, 'Average rating cannot be negative'],
        max: [5, 'Average rating cannot exceed 5'],
        default: 0,
      },
      totalRatings: {
        type: Number,
        min: [0, 'Total ratings cannot be negative'],
        default: 0,
      },
    },
    completedJobs: {
      type: Number,
      default: 0,
      min: [0, 'Completed jobs counter cannot be negative'],
    },
    cancelledJobs: {
      type: Number,
      default: 0,
      min: [0, 'Cancelled jobs counter cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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

// Compound indexes for dispatch filtering and performance
mechanicSchema.index({ availabilityStatus: 1, workStatus: 1, verificationStatus: 1 });
mechanicSchema.index({ supportedVehicleTypes: 1, availabilityStatus: 1 });
mechanicSchema.index({ supportedServiceIds: 1 });
mechanicSchema.index({ verificationStatus: 1, createdAt: -1 });

const Mechanic = mongoose.model('Mechanic', mechanicSchema);

module.exports = Mechanic;
