import mongoose from "mongoose";

const userFollowSchema = new mongoose.Schema(
  {
    followerFederatedId: {
      type: String,
      required: true
    },

    followingFederatedId: {
      type: String,
      required: true
    },

    serverName: {
      type: String,
      required: true
    },

    /* ===== FEDERATION ===== */

    followerOriginServer: {
      type: String,
      required: true
    },

    followingOriginServer: {
      type: String,
      required: true
    },

    isRemote: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Prevent duplicate follows
// userFollowSchema.index(
//   { followerFederatedId: 1, followingFederatedId: 1 },
//   { unique: true }
// );

export default mongoose.model("UserFollow", userFollowSchema);
