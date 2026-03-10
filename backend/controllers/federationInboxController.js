import FederationEvent from "../models/FederationEvent.js";
import { createError } from "../utils/error.js";
import crypto from "crypto";

import { followUserService, unfollowUserService } from "../services/userService.js";
import { followChannelService, unFollowChannelService } from "../services/channelService.js";
import { toggleLikePostService, addCommentService, createPostService, deletePostService } from "../services/postService.js";
import { createReportService } from "../services/reportService.js";

import User from "../models/User.js";
import Channel from "../models/Channel.js";
import Post from "../models/Post.js";

export const federationInbox = async (req, res, next) => {
  let eventDoc = null; // Tracked outside try so catch can reliably mark it as failed
  try {
    const payload = req.body;

    // senderServer is set by verifyFederationRequest middleware on req.federation.
    // Falls back to a top-level field when testing without the middleware enabled.
    const senderServer = req.federation?.originServer;

    if (!payload || !payload.type || !payload.eventId) {
      return next(createError(400, "Invalid federation request: missing required payload fields"));
    }

    // 1. Prevent duplicate event processing (idempotency)
    const existingEvent = await FederationEvent.findOne({ eventId: payload.eventId });
    if (existingEvent) {
      return res.status(200).json({ success: true, message: "Event already processed" });
    }

    // 2. Store event as incoming/pending for auditability
    const eventDoc = await FederationEvent.create({
      ...payload,
      direction: "incoming",
      senderServer: senderServer || payload.actor?.server || "unknown",
      processingStatus: "pending"
    });

    // 3. Process event by type
    switch (payload.type) {

      case "FOLLOW_USER": {
        const targetUser = await User.findOne({ federatedId: payload.object.federatedId });
        if (!targetUser) throw createError(404, "Target user not found");

        await followUserService(
          payload.actor.federatedId,
          payload.object.federatedId,
          payload.actor.server,
          process.env.SERVER_NAME,
          true // isRemote: true
        );
        break;
      }

      case "UNFOLLOW_USER": {
        await unfollowUserService(
          payload.actor.federatedId,
          payload.object.federatedId
        );
        break;
      }

      case "FOLLOW_CHANNEL": {
        const channel = await Channel.findOne({ federatedId: payload.object.federatedId });
        if (!channel) throw createError(404, "Channel not found");

        await followChannelService(payload.actor.federatedId, channel, true); // isRemote: true
        break;
      }

      case "UNFOLLOW_CHANNEL": {
        const channel = await Channel.findOne({ federatedId: payload.object.federatedId });
        if (!channel) throw createError(404, "Channel not found");

        await unFollowChannelService(payload.actor.federatedId, channel);
        break;
      }

      case "LIKE_POST": {
        const post = await Post.findOne({ federatedId: payload.object.federatedId });
        if (!post) throw createError(404, "Post not found");

        await toggleLikePostService(post, payload.actor.federatedId);
        break;
      }

      case "COMMENT_POST": {
        const post = await Post.findOne({ federatedId: payload.object.federatedId });
        if (!post) throw createError(404, "Post not found");

        await addCommentService(post, {
          displayName: payload.data.displayName,
          image: payload.data.image || null,
          content: payload.data.content,
          commentFederatedId: `${payload.actor.federatedId}/comment/${crypto.randomUUID()}`,
          originServer: payload.actor.server
        });
        break;
      }

      case "CREATE_POST": {
        await createPostService({
          description: payload.data.description,
          image: payload.data.image || null,
          isUserPost: payload.data.isUserPost || false,
          userDisplayName: payload.data.userDisplayName,
          authorFederatedId: payload.actor.federatedId,
          isChannelPost: payload.data.isChannelPost || false,
          channelName: payload.data.channelName || null,
          federatedId: payload.object.federatedId,
          originServer: payload.actor.server,
          isRemote: true,
          isRepost: payload.data.isRepost || false,
          originalPostFederatedId: payload.data.originalPostFederatedId || null,
          originalAuthorFederatedId: payload.data.originalAuthorFederatedId || null
        });
        break;
      }

      case "DELETE_POST": {
        const postToDelete = await Post.findOne({
          federatedId: payload.object.federatedId
        });
        if (postToDelete) {
          await deletePostService(postToDelete);
        }
        break;
      }

      case "REPORT": {
        await createReportService({
          reporterId: payload.actor.federatedId,
          reportedId: payload.object.federatedId,
          targetType: payload.data.targetType,
          reason: payload.data.reason,
          description: payload.data.description,
          targetOriginServer: process.env.SERVER_NAME,
          isRemoteTarget: false
        });
        break;
      }

      default:
        throw createError(400, `Unsupported federation event type: ${payload.type}`);
    }

    // 4. Mark event as successfully processed
    eventDoc.processingStatus = "processed";
    await eventDoc.save();

    return res.status(200).json({
      success: true,
      message: "Federation event processed"
    });

  } catch (err) {
    // If the event document was created before the failure, mark it as failed.
    // Using the reference directly avoids a DB lookup and handles the case
    // where failure happened before eventDoc was created (it stays null).
    if (eventDoc) {
      eventDoc.processingStatus = "failed";
      await eventDoc.save().catch(() => { }); // Don't mask the original error
    }
    next(err);
  }
};