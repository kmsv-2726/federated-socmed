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

    serverName: {
      type: String,
      required: true,
      enum: ["sports", "food"]
    },

    federatedId: {
      type: String,
      required: true,
      unique: true
    },

    /* ===== SOCIAL GRAPH ===== */

    followers: {
      type: [String], 
      default: []
    },

    following: {
      type: [String], 
      default: []
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
