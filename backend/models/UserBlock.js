import mongoose from 'mongoose';

const userBlockSchema = new mongoose.Schema(
    {
        blockerFederatedId: {
            type: String,
            required: true,
            index: true
        },
        blockedFederatedId: {
            type: String,
            required: true,
            index: true
        }
    },
    { timestamps: true }
);

// A user can only block another user once
userBlockSchema.index({ blockerFederatedId: 1, blockedFederatedId: 1 }, { unique: true });

export default mongoose.model('UserBlock', userBlockSchema);
