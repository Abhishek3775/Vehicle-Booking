const mongoose = require('mongoose');
const { USER_ACCOUNT_STATUS, GENDERS, DEFAULT_PREFERENCES } = require('./user.constants');

/**
 * User Schema
 *
 * Dedicated strictly to user profile, personal information,
 * preferences, and account profile lifecycle.
 * Authentication credentials, OTPs, and tokens belong to Auth model.
 */
const userSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'User ID (Auth identity reference) is required'],
      unique: true,
      index: true,
    },
    authId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auth',
      index: true,
      default: null,
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
      default: '',
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      unique: true,
      sparse: true,
    },
    profileImage: {
      type: String,
      trim: true,
      default: null,
    },
    gender: {
      type: String,
      enum: {
        values: [...Object.values(GENDERS), null],
        message: '{VALUE} is not a valid gender value',
      },
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ...DEFAULT_PREFERENCES }),
    },
    accountStatus: {
      type: String,
      enum: Object.values(USER_ACCOUNT_STATUS),
      default: USER_ACCOUNT_STATUS.ACTIVE,
      index: true,
    },
    deactivatedAt: {
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

// Secondary Indexes
userSchema.index({ userId: 1, accountStatus: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
