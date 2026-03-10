import mongoose from "mongoose";

const federationEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true // prevents duplicate processing
    },

    type: {
      type: String,
      required: true,
      enum: [
        "FOLLOW_USER",
        "UNFOLLOW_USER",
        "FOLLOW_CHANNEL",
        "UNFOLLOW_CHANNEL",
        "CREATE_POST",
        "DELETE_POST",
        "LIKE_POST",
        "COMMENT_POST",
        "REPORT"
      ]
    },

    actor: {
      federatedId: {
        type: String,
        required: true
      },
      server: {
        type: String,
        required: true
      }
    },

    object: {
      federatedId: {
        type: String,
        required: true
      }
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    timestamp: {
      type: Number,
      required: true
    },

    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true
    },

    senderServer: {
      type: String,
      required: true
    },

    processingStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export default mongoose.model("FederationEvent", federationEventSchema);