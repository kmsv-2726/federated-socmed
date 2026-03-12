import mongoose from "mongoose";

const channelRequestSchema = new mongoose.Schema(
    {
        channelFederatedId: {
            type: String,
            required: true
        },
        channelName: {
            type: String,
            required: true
        },
        userFederatedId: {
            type: String,
            required: true
        },
        userDisplayName: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        }
    },
    { timestamps: true }
);

// Prevent duplicate requests from the same user to the same channel
channelRequestSchema.index(
    { channelFederatedId: 1, userFederatedId: 1 },
    { unique: true }
);

export default mongoose.model("ChannelRequest", channelRequestSchema);
