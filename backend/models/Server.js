import mongoose from "mongoose";

const serverSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            maxlength: 500
        },
        url: {
            type: String,
            required: true,
            unique: true
        },
        category: {
            type: String,
            default: "general"
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Server", serverSchema);
