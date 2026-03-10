import User from "../models/User.js";
import UserFollow from "../models/UserFollow.js";
import { createError } from "../utils/error.js";

/**
 * Core follow logic.
 * Used by:
 * - REST followUser controller
 * - Federation inbox FOLLOW event
 */
export const followUserService = async (followerFederatedId, followingFederatedId, followerOriginServer, followingOriginServer, isRemote = false) => {

  if (followerFederatedId === followingFederatedId) {
    throw createError(400, "You cannot follow yourself");
  }

  const existing = await UserFollow.findOne({
    followerFederatedId,
    followingFederatedId
  });

  if (existing) {
    throw createError(400, "Already following");
  }

  const newFollow = new UserFollow({
    followerFederatedId,
    followingFederatedId,
    serverName: followerOriginServer,
    followerOriginServer,
    followerOriginServer,
    followingOriginServer,
    isRemote
  });

  await newFollow.save();

  await User.findOneAndUpdate(
    { federatedId: followerFederatedId },
    { $inc: { followingCount: 1 } }
  );

  await User.findOneAndUpdate(
    { federatedId: followingFederatedId },
    { $inc: { followersCount: 1 } }
  );
}


/**
 * Core unfollow logic.
 * Used by:
 * - REST unfollowUser controller
 * - Federation inbox UNFOLLOW event
 */
export const unfollowUserService = async (
  followerFederatedId,
  followingFederatedId
) => {

  if (followerFederatedId === followingFederatedId) {
    throw createError(400, "You cannot unfollow yourself");
  }

  const followStatus = await UserFollow.findOne({
    followerFederatedId,
    followingFederatedId
  });

  if (!followStatus) {
    throw createError(400, "Not following");
  }

  await UserFollow.findOneAndDelete({
    followerFederatedId,
    followingFederatedId
  });

  await User.findOneAndUpdate(
    { federatedId: followerFederatedId },
    { $inc: { followingCount: -1 } }
  );

  await User.findOneAndUpdate(
    { federatedId: followingFederatedId },
    { $inc: { followersCount: -1 } }
  );
};

/**
 * Shared service for retrieving a user's profile data.
 * Used by userController (local views) and federationFeedController (remote views).
 */
export const getUserProfileService = async (federatedId) => {
  const userProfile = await User.findOne({ federatedId }).select("-password");
  if (!userProfile) throw createError(404, "User not found");
  return userProfile;
};

// ── Search & Discovery Logic ──────────────────

import axios from "axios";

const DEFAULT_RESULT_LIMIT = 20;
const FEDERATED_ID_REGEX = /^[\w.-]+(@[\w.-]+)?$/;

export const parseSearchQuery = (rawQuery) => {
  if (!rawQuery || typeof rawQuery !== "string") {
    return { username: null, serverName: null, isValid: false, error: "Search query is required" };
  }

  const trimmed = rawQuery.trim();

  if (!FEDERATED_ID_REGEX.test(trimmed)) {
    return {
      username: null,
      serverName: null,
      isValid: false,
      error: "Invalid search query format. Use 'username' or 'username@server'."
    };
  }

  if (trimmed.includes("@")) {
    const atIndex = trimmed.indexOf("@");
    const username = trimmed.substring(0, atIndex);
    const serverName = trimmed.substring(atIndex + 1);

    if (!username || !serverName) {
      return {
        username: null,
        serverName: null,
        isValid: false,
        error: "Invalid format. Both username and server name are required in 'username@server'."
      };
    }

    return { username, serverName, isValid: true, error: null };
  }

  return { username: trimmed, serverName: null, isValid: true, error: null };
};

export const searchLocalUsers = async (partialUsername, limit = DEFAULT_RESULT_LIMIT) => {
  return await User.find(
    {
      displayName: { $regex: partialUsername, $options: "i" },
      isRemote: { $ne: true }
    },
    {
      displayName: 1,
      avatarUrl: 1,
      federatedId: 1,
      followersCount: 1,
      followingCount: 1,
      serverName: 1
    }
  ).limit(limit);
};

export const searchRemoteUsers = async (username, serverName, limit = DEFAULT_RESULT_LIMIT) => {
  const remoteSearchEnabled = process.env.ENABLE_REMOTE_SEARCH !== "false";
  if (!remoteSearchEnabled) {
    throw createError(403, "Remote search is disabled on this server.");
  }

  const serverPortMap = {
    food: 5000,
    sports: 5001
  };

  const port = serverPortMap[serverName];
  if (!port) {
    throw createError(400, `Unknown remote server: ${serverName}`);
  }

  try {
    const response = await axios.get(
      `http://localhost:${port}/api/user/search`, // Important: already targetting the new proposed path!
      {
        params: { q: username, limit },
        timeout: 5000
      }
    );

    const remoteUsers = response.data?.users || [];

    for (const remoteUser of remoteUsers) {
      if (remoteUser.federatedId) {
        await User.findOneAndUpdate(
          { federatedId: remoteUser.federatedId },
          {
            $setOnInsert: {
              displayName: remoteUser.displayName || remoteUser.federatedId.split("@")[0],
              avatarUrl: remoteUser.avatarUrl || null,
              federatedId: remoteUser.federatedId,
              serverName: serverName,
              originServer: serverName,
              isRemote: true,
              followersCount: remoteUser.followersCount || 0,
              followingCount: remoteUser.followingCount || 0,
              firstName: remoteUser.displayName || remoteUser.federatedId.split("@")[0],
              lastName: ".",
              dob: new Date("2000-01-01"),
              email: `${remoteUser.federatedId}@cached`,
              password: "REMOTE_NO_LOGIN"
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    return remoteUsers.slice(0, limit);
  } catch (err) {
    if (err.status === 403) throw err;
    throw createError(502, `Failed to reach remote server '${serverName}': ${err.message}`);
  }
};

export const enrichWithFollowStatus = async (users, currentFederatedId) => {
  if (!currentFederatedId || users.length === 0) return users;

  const userFederatedIds = users.map((u) => u.federatedId);

  const follows = await UserFollow.find({
    followerFederatedId: currentFederatedId,
    followingFederatedId: { $in: userFederatedIds }
  });

  const followingSet = new Set(follows.map((f) => f.followingFederatedId));

  return users.map((u) => {
    const userObj = u.toObject ? u.toObject() : { ...u };
    userObj.is_following = followingSet.has(userObj.federatedId);
    return userObj;
  });
};

/**
 * Shared service for searching users using regex.
 * Used by userController (local search) and federationFeedController (remote search).
 */
export const searchUsersService = async (query, limit = 5) => {
  // Extract all users with regex and limit it
  return await User.find(
    {
      $or: [
        { displayName: { $regex: query, $options: "i" } },
        { federatedId: { $regex: query, $options: "i" } }
      ]
    },
    { displayName: 1, avatarUrl: 1, federatedId: 1, followersCount: 1, followingCount: 1 }
  ).limit(limit);
};

