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
  const user = await User.findOne(
    { federatedId },
    { displayName: 1, avatarUrl: 1, federatedId: 1, followersCount: 1, followingCount: 1 }
  );
  if (!user) throw createError(404, "User not found");
  return user;
};

/**
 * Shared service for searching users using regex.
 * Used by userController (local search) and federationFeedController (remote search).
 */
export const searchUsersService = async (query) => {
  // Extract all users with regex and limit it to 5
  return await User.find(
    {
      $or: [
        { displayName: { $regex: query, $options: "i" } },
        { federatedId: { $regex: query, $options: "i" } }
      ]
    },
    { displayName: 1, avatarUrl: 1, federatedId: 1, followersCount: 1, followingCount: 1 }
  ).limit(5);
};

