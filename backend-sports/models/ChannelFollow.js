import mongoose from "mongoose";

const channelFollowSchema = new mongoose.Schema(
  {
    userFederatedId: {
      type: String,
      required: true,
    },

    channelFederatedId: {
      type: String,
      required: true
    },

    channelName: {
      type: String,
      required: true
    },

    serverName: {
      type: String,
      required: true
    },

    userOriginServer: {
      type: String,
      required: true
    },

    channelOriginServer: {
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

// channelFollowSchema.index(
//   { userFederatedId: 1, channelFederatedId: 1 },
//   { unique: true }
// );

export default mongoose.model("ChannelFollow", channelFollowSchema);
