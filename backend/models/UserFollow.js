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
    }
  },
  { timestamps: true }
);

// Prevent duplicate follows
userFollowSchema.index(
  { followerFederatedId: 1, followingFederatedId: 1 },
  { unique: true }
);

export default mongoose.model("UserFollow", userFollowSchema);
