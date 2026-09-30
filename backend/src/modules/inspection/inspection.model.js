const mongoose = require('mongoose');
const {
  INSPECTION_STATUS,
  OVERALL_CONDITION,
  CHECKLIST_CONDITION,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  INSPECTION_CATEGORIES,
  PHOTO_CATEGORIES,
  INSPECTION_LIMITS,
} = require('./inspection.constants');

/**
 * Inspection Finding Sub-Schema
 */
const findingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Finding title is required'],
      trim: true,
      minlength: [INSPECTION_LIMITS.TITLE_MIN_LENGTH, `Title must be at least ${INSPECTION_LIMITS.TITLE_MIN_LENGTH} characters`],
      maxlength: [INSPECTION_LIMITS.TITLE_MAX_LENGTH, `Title cannot exceed ${INSPECTION_LIMITS.TITLE_MAX_LENGTH} characters`],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [INSPECTION_LIMITS.DESC_MAX_LENGTH, `Description cannot exceed ${INSPECTION_LIMITS.DESC_MAX_LENGTH} characters`],
      default: '',
    },
    severity: {
      type: String,
      enum: {
        values: Object.values(SEVERITY_LEVELS),
        message: '{VALUE} is not a valid severity level',
      },
      default: SEVERITY_LEVELS.MEDIUM,
    },
    category: {
      type: String,
      enum: {
        values: Object.values(INSPECTION_CATEGORIES),
        message: '{VALUE} is not a valid inspection category',
      },
      default: INSPECTION_CATEGORIES.OTHER,
    },
  },
  { _id: true }
);

/**
 * Recommended Service Sub-Schema
 */
const recommendedServiceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service ID is required'],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [INSPECTION_LIMITS.REASON_MAX_LENGTH, `Reason cannot exceed ${INSPECTION_LIMITS.REASON_MAX_LENGTH} characters`],
      default: '',
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(PRIORITY_LEVELS),
        message: '{VALUE} is not a valid priority level',
      },
      default: PRIORITY_LEVELS.MEDIUM,
    },
  },
  { _id: true }
);

/**
 * Recommended Part Sub-Schema
 */
const recommendedPartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Part name is required'],
      trim: true,
      maxlength: [INSPECTION_LIMITS.ITEM_NAME_MAX_LENGTH, `Part name cannot exceed ${INSPECTION_LIMITS.ITEM_NAME_MAX_LENGTH} characters`],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [INSPECTION_LIMITS.REASON_MAX_LENGTH, `Reason cannot exceed ${INSPECTION_LIMITS.REASON_MAX_LENGTH} characters`],
      default: '',
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(PRIORITY_LEVELS),
        message: '{VALUE} is not a valid priority level',
      },
      default: PRIORITY_LEVELS.MEDIUM,
    },
  },
  { _id: true }
);

/**
 * Checklist Item Sub-Schema
 */
const checklistItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: {
        values: Object.values(INSPECTION_CATEGORIES),
        message: '{VALUE} is not a valid category',
      },
      default: INSPECTION_CATEGORIES.OTHER,
    },
    item: {
      type: String,
      required: [true, 'Checklist item name is required'],
      trim: true,
      maxlength: [INSPECTION_LIMITS.ITEM_NAME_MAX_LENGTH, `Item name cannot exceed ${INSPECTION_LIMITS.ITEM_NAME_MAX_LENGTH} characters`],
    },
    condition: {
      type: String,
      enum: {
        values: Object.values(CHECKLIST_CONDITION),
        message: '{VALUE} is not a valid condition',
      },
      default: CHECKLIST_CONDITION.NOT_CHECKED,
    },
    observation: {
      type: String,
      trim: true,
      maxlength: [INSPECTION_LIMITS.DESC_MAX_LENGTH, `Observation cannot exceed ${INSPECTION_LIMITS.DESC_MAX_LENGTH} characters`],
      default: '',
    },
  },
  { _id: true }
);

/**
 * Inspection Photo Sub-Schema
 */
const photoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Photo URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      enum: {
        values: Object.values(PHOTO_CATEGORIES),
        message: '{VALUE} is not a valid photo category',
      },
      default: PHOTO_CATEGORIES.VEHICLE,
    },
    caption: {
      type: String,
      trim: true,
      default: '',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Inspection Video Sub-Schema
 */
const videoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
      default: null,
    },
    caption: {
      type: String,
      trim: true,
      default: '',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);



/**
 * Inspection Schema
 *
 * Represents vehicle inspection reports captured on-site by assigned technicians.
 */
const inspectionSchema = new mongoose.Schema(
  {
    inspectionReference: {
      type: String,
      required: [true, 'Inspection reference is required'],
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mechanic user reference is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer user reference is required'],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(INSPECTION_STATUS),
        message: '{VALUE} is not a valid inspection status',
      },
      default: INSPECTION_STATUS.IN_PROGRESS,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    overallCondition: {
      type: String,
      enum: {
        values: [...Object.values(OVERALL_CONDITION), null],
        message: '{VALUE} is not a valid overall condition',
      },
      default: null,
    },
    customerComplaint: {
      type: String,
      trim: true,
      default: '',
    },
    findings: {
      type: [findingSchema],
      default: [],
    },
    recommendedServices: {
      type: [recommendedServiceSchema],
      default: [],
    },
    recommendedParts: {
      type: [recommendedPartSchema],
      default: [],
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    photos: {
      type: [photoSchema],
      default: [],
    },
    videos: {
      type: [videoSchema],
      default: [],
    },
    mechanicNotes: {
      type: String,
      trim: true,
      maxlength: [INSPECTION_LIMITS.NOTES_MAX_LENGTH, `Mechanic notes cannot exceed ${INSPECTION_LIMITS.NOTES_MAX_LENGTH} characters`],
      default: '',
    },
    customerNotes: {
      type: String,
      trim: true,
      maxlength: [INSPECTION_LIMITS.NOTES_MAX_LENGTH, `Customer notes cannot exceed ${INSPECTION_LIMITS.NOTES_MAX_LENGTH} characters`],
      default: '',
    },
    customerAcknowledgement: {
      acknowledged: {
        type: Boolean,
        default: false,
      },
      acknowledgedAt: {
        type: Date,
        default: null,
      },
      acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
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

// Compound indexes for lookup optimization
inspectionSchema.index({ bookingId: 1, status: 1 });
inspectionSchema.index({ mechanicId: 1, status: 1 });
inspectionSchema.index({ userId: 1, createdAt: -1 });
inspectionSchema.index({ status: 1, createdAt: -1 });

const Inspection = mongoose.model('Inspection', inspectionSchema);

module.exports = Inspection;
