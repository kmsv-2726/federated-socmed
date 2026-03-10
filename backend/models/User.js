import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    /* ===== IDENTITY ===== */
    displayName: {
      type: String,
      required: true,
      trim: true
    },

    firstName: {
      type: String,
      required: true,
      trim: true
    },

    middleName: {
      type: String,
      default: null,
      trim: true
    },

    lastName: {
      type: String,
      required: true,
      trim: true
    },

    dob: {
      type: Date,
      required: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    avatarUrl: {
      type: String,
      default: null
    },

    bannerUrl: {
      type: String,
      default: null
    },

    serverName: {
      type: String,
      required: true
    },

    federatedId: {
      type: String,
      required: true,
      unique: true
    },

    /* ===== SOCIAL GRAPH ===== */

    followersCount: {
      type: Number,
      default: 0,
      min: 0
    },

    followingCount: {
      type: Number,
      default: 0,
      min: 0
    },

    /* ===== AUTH & STATUS ===== */

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isSuspended: {
      type: Boolean,
      default: false
    },

    lastLoginAt: {
      type: Date,
      default: null
    },

    tokenVersion: {
      type: Number,
      default: 0
    },

    failedLoginAttempts: {
      type: Number,
      default: 0
    },

    unlockToken: {
      type: String,
      default: null
    },

    unlockTokenExpiry: {
      type: Date,
      default: null
    },

    /* ===== FEDERATION ===== */

    originServer: {
      type: String,
      required: true,
      immutable: true
    },

    isRemote: {
      type: Boolean,
      default: false
    }

  },
  { timestamps: true }
);

// /* ===== INDEXES ===== */

// userSchema.index(
//   { displayName: 1, serverName: 1 },
//   { unique: true }
// );

// userSchema.index(
//   { email: 1, serverName: 1 },
//   { unique: true }
// );

// userSchema.index({ federatedId: 1 });
// userSchema.index({ followers: 1 });
// userSchema.index({ following: 1 });

export default mongoose.model("User", userSchema);
