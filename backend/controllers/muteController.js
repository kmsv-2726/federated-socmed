import UserMute from '../models/UserMute.js';
import { createError } from '../utils/error.js';

/**
 * Toggle Mute Status
 * PUT /api/mutes/:federatedId/toggle
 */
export const toggleMuteUser = async (req, res, next) => {
    try {
        const muterFederatedId = req.user.federatedId;
        const mutedFederatedId = req.params.federatedId;

        if (!mutedFederatedId) {
            return next(createError(400, "Target federatedId is required"));
        }

        if (muterFederatedId === mutedFederatedId) {
            return next(createError(400, "You cannot mute yourself"));
        }

        // Check if mute exists
        const existingMute = await UserMute.findOne({
            muterFederatedId,
            mutedFederatedId
        });

        if (existingMute) {
            // Unmute
            await UserMute.findByIdAndDelete(existingMute._id);
            return res.status(200).json({
                success: true,
                message: "User successfully unmuted",
                isMuted: false
            });
        } else {
            // Mute
            const newMute = new UserMute({
                muterFederatedId,
                mutedFederatedId
            });
            await newMute.save();
            return res.status(200).json({
                success: true,
                message: "User successfully muted",
                isMuted: true
            });
        }
    } catch (err) {
        next(err);
    }
};

/**
 * Get all users muted by the active user
 * GET /api/mutes
 */
export const getMutedUsers = async (req, res, next) => {
    try {
        const muterFederatedId = req.user.federatedId;

        const mutes = await UserMute.find({ muterFederatedId });

        // Extract just the IDs
        const mutedUserIds = mutes.map(mute => mute.mutedFederatedId);

        res.status(200).json({
            success: true,
            mutedUserIds
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Check if the active user has muted a specific user
 * GET /api/mutes/:federatedId/status
 */
export const checkMuteStatus = async (req, res, next) => {
    try {
        const muterFederatedId = req.user.federatedId;
        const mutedFederatedId = req.params.federatedId;

        if (!mutedFederatedId) {
            return next(createError(400, "Target federatedId is required"));
        }

        const existingMute = await UserMute.findOne({
            muterFederatedId,
            mutedFederatedId
        });

        res.status(200).json({
            success: true,
            isMuted: !!existingMute
        });
    } catch (err) {
        next(err);
    }
};
