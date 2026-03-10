import User from "../models/User.js";
import UserFollow from "../models/UserFollow.js";
import { createError } from "../utils/error.js";
import bcrypt from "bcrypt";
import {
  followUserService,
  unfollowUserService
} from "../services/userService.js";
import { sendFederationEvent } from "../services/federationService.js";
import TrustedServer from "../models/TrustedServer.js";
import axios from "axios";
import { getUserProfileService } from "../services/userService.js";
/**
 * Parses a federatedId and determines if the target lives on this server.
 * Returns { targetOriginServer, isRemote } or throws a 400 error.
 */
const resolveFollowTarget = (targetFederatedId, next) => {
  const parts = targetFederatedId.split("@");
  if (parts.length < 2) {
    throw createError(400, "Invalid federatedId format");
  }
  const targetOriginServer = parts[1];
  const isRemote = targetOriginServer !== process.env.SERVER_NAME;
  return { targetOriginServer, isRemote };
};

export const getAllProfiles = async (req, res, next) => {
  try {
    const users = await User.find(
      {},
      { displayName: 1, avatarUrl: 1, federatedId: 1, followersCount: 1, followingCount: 1 }
    );

    res.status(200).json({
      success: true,
      users
    });
  } catch (err) {
    next(err);
  }
}

export const getUserProfile = async (req, res, next) => {
  try {
    const federatedId = req.params.federatedId;
    const targetServer = federatedId.split("@")[1];

    if (!targetServer) {
      return next(createError(400, "Invalid federated ID format"));
    }

    // ── 1. Local Profile ─────────────────────────────────────────────────────
    if (targetServer === process.env.SERVER_NAME) {
      const user = await getUserProfileService(federatedId);
      return res.status(200).json({ success: true, user });
    }

    // ── 2. Remote Profile (Federated Search/View) ────────────────────────────
    const trusted = await TrustedServer.findOne({ serverName: targetServer, isActive: true });
    if (!trusted) {
      return next(createError(403, `Server ${targetServer} is not trusted or offline`));
    }

    try {
      const { data } = await axios.get(
        `${trusted.serverUrl}/api/federation/feed?type=GET_PROFILE&federatedId=${federatedId}`,
        {
          headers: { "x-origin-server": process.env.SERVER_NAME },
          timeout: 5000
        }
      );

      // Resolve relative URLs to absolute ones
      if (data.success && data.user) {
        if (data.user.avatarUrl && !data.user.avatarUrl.startsWith('http')) {
          data.user.avatarUrl = `${trusted.serverUrl}${data.user.avatarUrl}`;
        }
        if (data.user.bannerUrl && !data.user.bannerUrl.startsWith('http')) {
          data.user.bannerUrl = `${trusted.serverUrl}${data.user.bannerUrl}`;
        }
      }

      return res.status(200).json(data);
    } catch (error) {
      return next(createError(502, "Failed to fetch remote user profile"));
    }

  } catch (err) {
    next(err);
  }
}

export const followUser = async (req, res, next) => {
  try {
    const targetFederatedId = req.params.federatedId;
    const userId = req.user.federatedId;

    const { targetOriginServer, isRemote } = resolveFollowTarget(targetFederatedId);

    if (isRemote) {
      // 1. Write local record so THIS server knows userA follows userB@remote
      await followUserService(
        userId,
        targetFederatedId,
        req.user.serverName,
        targetOriginServer
      );

      // 2. Notify the remote server
      await sendFederationEvent({
        type: "FOLLOW_USER",
        actorFederatedId: userId,
        objectFederatedId: targetFederatedId
      });

      return res.status(200).json({
        success: true,
        message: "User followed successfully"
      });
    }

    const targetUser = await User.findOne({ federatedId: targetFederatedId });
    if (!targetUser) {
      return next(createError(404, "User not found"));
    }

    await followUserService(
      userId,
      targetFederatedId,
      req.user.serverName,
      targetOriginServer
    );

    res.status(200).json({
      success: true,
      message: "User followed successfully"
    });

  } catch (err) {
    next(err);
  }
};


export const unfollowUser = async (req, res, next) => {
  try {
    const targetFederatedId = req.params.federatedId;
    const userId = req.user.federatedId;

    const { isRemote } = resolveFollowTarget(targetFederatedId);

    if (isRemote) {
      // 1. Delete local record first
      await unfollowUserService(userId, targetFederatedId);

      // 2. Notify the remote server
      await sendFederationEvent({
        type: "UNFOLLOW_USER",
        actorFederatedId: userId,
        objectFederatedId: targetFederatedId
      });

      return res.status(200).json({
        success: true,
        message: "User unfollowed successfully"
      });
    }

    await unfollowUserService(userId, targetFederatedId);

    res.status(200).json({
      success: true,
      message: "User unfollowed successfully"
    });

  } catch (err) {
    next(err);
  }
};


export const checkFollowStatus = async (req, res, next) => {
  try {
    const targetFederatedId = req.params.federatedId;
    const userId = req.user.federatedId;
    if (targetFederatedId === userId) {
      return next(createError(400, "You cannot check follow status for yourself"));
    }

    const FollowStatus = await UserFollow.findOne({ followerFederatedId: userId, followingFederatedId: targetFederatedId });
    res.status(200).json({
      success: true,
      isFollowing: !!FollowStatus
    });
  } catch (err) {
    next(err);
  }
}

export const getMyFollowers = async (req, res, next) => {
  try {
    const userId = req.user.federatedId;

    const follow = await UserFollow.find({
      followingFederatedId: userId
    });

    if (follow.length === 0) {
      return res.status(200).json({
        success: true,
        followers: []
      });
    }

    const followerIds = follow.map(f => f.followerFederatedId);

    const followers = await User.find(
      { federatedId: { $in: followerIds } },
      { displayName: 1, avatarUrl: 1, federatedId: 1 }
    );

    res.status(200).json({
      success: true,
      followers
    });
  } catch (err) {
    next(err);
  }
};


export const getMyFollowing = async (req, res, next) => {
  try {
    const userId = req.user.federatedId;

    const follow = await UserFollow.find({
      followerFederatedId: userId
    });

    if (follow.length === 0) {
      return res.status(200).json({
        success: true,
        following: []
      });
    }

    const followingIds = follow.map(f => f.followingFederatedId);

    const following = await User.find(
      { federatedId: { $in: followingIds } },
      { displayName: 1, avatarUrl: 1, federatedId: 1 }
    );

    res.status(200).json({
      success: true,
      following
    });
  } catch (err) {
    next(err);
  }
};


export const resetPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword) {
      return next(createError(400, "Both old and new passwords are required"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return next(createError(401, "Incorrect old password"));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password AND increment tokenVersion
    user.password = hashedNewPassword;
    user.tokenVersion += 1;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful. All other devices have been logged out."
    });

  } catch (err) {
    next(err);
  }
};


