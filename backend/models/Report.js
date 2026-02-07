import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        /* ===== REPORTER INFO ===== */
        reporterId: {
            type: String,
            required: true,
            trim: true
        },

        /* ===== REPORT TARGET ===== */
        reportedId: {
            type: String,
            required: true,
            trim: true
        },

        targetType: {
            type: String,
            required: true,
            enum: ["user", "post"],
            default: "user"
        },

        /* ===== REPORT DETAILS ===== */
        reason: {
            type: String,
            required: true,
            enum: [
                "spam",
                "harassment",
                "hate_speech",
                "violence",
                "nudity",
                "misinformation",
                "other"
            ]
        },

        description: {
            type: String,
            maxlength: 1000,
            trim: true,
            default: ""
        },

        /* ===== STATUS & TRIAGE ===== */
        status: {
            type: String,
            enum: ["pending", "resolved", "dismissed"],
            default: "pending"
        },

        
    },
    { timestamps: true }
);

/* ===== INDEXES ===== */
// Index for finding reports by status (common query for queues)
// reportSchema.index({ status: 1, createdAt: 1 });

// // Index for checking history of a specific target
// reportSchema.index({ reportedId: 1 });

// // Index for reporter's history
// reportSchema.index({ reporterId: 1 });

export default mongoose.model("Report", reportSchema);
