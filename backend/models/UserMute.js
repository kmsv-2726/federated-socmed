import mongoose from 'mongoose';

const userMuteSchema = new mongoose.Schema(
    {
        muterFederatedId: {
            type: String,
            required: true,
            index: true
        },
        mutedFederatedId: {
            type: String,
            required: true,
            index: true
        }
    },
    { timestamps: true }
);

// A user can only mute another user once
userMuteSchema.index({ muterFederatedId: 1, mutedFederatedId: 1 }, { unique: true });

export default mongoose.model('UserMute', userMuteSchema);
