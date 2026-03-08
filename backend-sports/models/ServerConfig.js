import mongoose from "mongoose";

const serverConfigSchema = new mongoose.Schema(
    {
        serverName: {
            type: String,
            required: true,
            unique: true
        },
        description: {
            type: String,
            default: "Welcome to our federated social network."
        },
        rules: {
            type: String,
            default: "1. Be respectful to others.\n2. No spam or self-promotion.\n3. Follow the general guidelines."
        }
    },
    { timestamps: true }
);

export default mongoose.model("ServerConfig", serverConfigSchema);
