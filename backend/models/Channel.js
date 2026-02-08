import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    /* ========= CORE ========= */

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      immutable: true
    },

    image: {
      type: String,
      required: false,
      default: null
    },

    description: {
      type: String,
      required: true,
      maxlength: 500
    },

    rules: {
      type: [String],
      required: true,
      default: []
    },

    /* ========= VISIBILITY ========= */

    visibility: {
      type: String,
      enum: ["public", "read-only", "private"],
      default: "public"
    },

    /* ========= FOLLOWERS ========= */

    followersCount: {
      type: Number,
      default: 0,
      min: 0
    },

    /* ========= IDENTITY / FEDERATION ========= */

    federatedId: {
      type: String,
      required: true,
      unique: true
    },

    originServer: {
      type: String,
      required: true
    },

    serverName: {
      type: String,
      required: true
    },

    isRemote: {
      type: Boolean,
      default: false
    },

    /* ========= META ========= */

    createdBy: {
      type: String, // federated user id
      required: true
    }
  },
  {
    timestamps: true
  }
);

/* ========= INDEXES ========= */

// channelSchema.index({ name: 1 });
// channelSchema.index({ serverName: 1 });
// channelSchema.index({ visibility: 1 });

export default mongoose.model("Channel", channelSchema);
