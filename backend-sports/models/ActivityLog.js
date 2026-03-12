import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        username: { type: String, required: true },
        federatedId: { type: String },
        action: { type: String, enum: ["LOGIN", "LOGOUT"], required: true },
    },
    { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
