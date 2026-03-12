import UserBlock from '../models/UserBlock.js';
import User from '../models/User.js';
import { createError } from '../utils/error.js';

/**
 * Toggle Block Status
 * PUT /api/blocks/:federatedId/toggle
 */
export const toggleBlockUser = async (req, res, next) => {
    try {
        const blockerFederatedId = req.user.federatedId;
        const blockedFederatedId = req.params.federatedId;

        if (!blockedFederatedId) {
            return next(createError(400, "Target federatedId is required"));
        }

        if (blockerFederatedId === blockedFederatedId) {
            return next(createError(400, "You cannot block yourself"));
        }

        // Check if block exists
        const existingBlock = await UserBlock.findOne({
            blockerFederatedId,
            blockedFederatedId
        });

        if (existingBlock) {
            // Unblock
            await UserBlock.findByIdAndDelete(existingBlock._id);
            return res.status(200).json({
                success: true,
                message: "User successfully unblocked",
                isBlocked: false
            });
        } else {
            // Block
            const newBlock = new UserBlock({
                blockerFederatedId,
                blockedFederatedId
            });
            await newBlock.save();
            return res.status(200).json({
                success: true,
                message: "User successfully blocked",
                isBlocked: true
            });
        }
    } catch (err) {
        next(err);
    }
};

/**
 * Check if the active user has blocked a specific user
 * GET /api/blocks/:federatedId/status
 */
export const checkBlockStatus = async (req, res, next) => {
    try {
        const blockerFederatedId = req.user.federatedId;
        const blockedFederatedId = req.params.federatedId;

        if (!blockedFederatedId) {
            return next(createError(400, "Target federatedId is required"));
        }

        const existingBlock = await UserBlock.findOne({
            blockerFederatedId,
            blockedFederatedId
        });

        res.status(200).json({
            success: true,
            isBlocked: !!existingBlock
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get all users blocked by the active user
 * GET /api/blocks
 */
export const getBlockedUsers = async (req, res, next) => {
    try {
        const blockerFederatedId = req.user.federatedId;

        const blocks = await UserBlock.find({ blockerFederatedId });

        // Extract just the IDs
        const blockedUserIds = blocks.map(block => block.blockedFederatedId);

        res.status(200).json({
            success: true,
            blockedUserIds
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Check if either user has blocked the other
 * GET /api/blocks/:federatedId/check-both
 */
export const checkBothBlocks = async (req, res, next) => {
    try {
        const myFederatedId = req.user.federatedId;
        const targetFederatedId = req.params.federatedId;

        if (!targetFederatedId) {
            return next(createError(400, "Target federatedId is required"));
        }

        const block = await UserBlock.findOne({
            $or: [
                { blockerFederatedId: myFederatedId, blockedFederatedId: targetFederatedId },
                { blockerFederatedId: targetFederatedId, blockedFederatedId: myFederatedId }
            ]
        });

        res.status(200).json({
            success: true,
            isBlocked: !!block,
            details: block ? (block.blockerFederatedId === myFederatedId ? 'you_blocked' : 'they_blocked') : null
        });
    } catch (err) {
        next(err);
    }
};
