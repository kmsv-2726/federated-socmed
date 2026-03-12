import { createError } from "../utils/error.js";
import Channel from "../models/Channel.js";
import ChannelFollow from "../models/ChannelFollow.js";
import ChannelRequest from "../models/ChannelRequest.js";
import TrustedServer from "../models/TrustedServer.js";
import axios from "axios";
import {
  followChannelService,
  unFollowChannelService,
  getChannelProfileService
} from "../services/channelService.js";
import { sendFederationEvent } from "../services/federationService.js";

/**
 * Parses a channelInput (e.g. "food" or "food@sports.net") and resolves
 * whether the target is local or remote.
 * Returns { isLocal, name, targetServer } or throws a 400 error.
 */
const resolveChannelTarget = (channelInput) => {
  if (!channelInput.includes("@")) {
    return { isLocal: true, name: channelInput, targetServer: process.env.SERVER_NAME };
  }
  const parts = channelInput.split("@");
  if (parts.length !== 2) {
    throw createError(400, "Invalid channel format");
  }
  const [name, targetServer] = parts;
  const isLocal = targetServer === process.env.SERVER_NAME;
  return { isLocal, name, targetServer };
};


export const createChannel = async (req, res, next) => {
  try {
    const { name, description, rules, visibility = 'public', image, bannedWords = [] } = req.body;
    if (!name || !description || !rules) {
      return next(createError(400, "Missing required fields: name, description, and rules are required"));
    }

    const federatedId = `${name}@${req.user.serverName}`;
    const createdBy = req.user.federatedId;
    const newChannel = new Channel({
      name,
      description,
      rules,
      visibility,
      bannedWords,
      image: image || null,
      federatedId,
      originServer: req.user.serverName,
      serverName: req.user.serverName,
      createdBy: createdBy,
      followersCount: 0
    });

    const savedChannel = await newChannel.save();
    res.status(201).json({
      success: true,
      channel: savedChannel
    });

  } catch (err) {
    next(err);
  }
}

export const deleteChannel = async (req, res, next) => {
  try {
    const ChannelId = req.params.id;
    const channel = await Channel.findById(ChannelId);
    if (!channel) {
      return next(createError(404, "Channel not found"));
    }
    if (channel.isRemote) {
      return next(createError(403, "Cannot delete remote channel"));
    }
    if (
      channel.createdBy !== req.user.federatedId &&
      req.user.role !== "admin"
    ) {
      return next(createError(403, "Unauthorized action"));
    }
    await Channel.findByIdAndDelete(ChannelId);
    res.status(200).json({
      success: true,
      message: "Channel deleted successfully"
    });
  } catch (err) {
    next(err);
  }
}


export const getChannel = async (req, res, next) => {
  try {
    const searchInput = req.params.channelName;

    // ── 0. Local Fuzzy Search (No '@' provided) ──────────────────────────────
    if (!searchInput.includes("@")) {
      const channels = await Channel.find({
        name: { $regex: searchInput, $options: "i" },
        serverName: process.env.SERVER_NAME
      }).limit(5);

      return res.status(200).json({
        success: true,
        channels
      });
    }

    // ── Federated Search/View (Requires '@') ─────────────────────────────────
    const { isLocal, targetServer } = resolveChannelTarget(searchInput);

    // ── 1. Local Channel by Federated ID ─────────────────────────────────────
    if (isLocal) {
      const channels = await Channel.find({
        federatedId: searchInput
      }).limit(1);

      return res.status(200).json({ success: true, channels });
    }

    // ── 2. Remote Channel (Federated Search/View) ────────────────────────────
    if (!targetServer || targetServer.trim() === "") {
      return res.status(200).json({ success: true, channels: [] });
    }

    const trusted = await TrustedServer.findOne({ serverName: targetServer, isActive: true });
    if (!trusted) {
      // If it's a search for an unknown server, just return empty instead of breaking the UI
      return res.status(200).json({ success: true, channels: [] });
    }

    try {
      // First attempt a search to get a list (unified behavior)
      const { data } = await axios.get(
        `${trusted.serverUrl}/api/federation/feed?type=SEARCH_CHANNELS&query=${encodeURIComponent(searchInput)}`,
        {
          headers: { "x-origin-server": process.env.SERVER_NAME },
          timeout: 5000
        }
      );
      
      if (data.success && data.channels && data.channels.length > 0) {
        return res.status(200).json({ success: true, channels: data.channels });
      }

      // Fallback to GET_CHANNEL if search yields nothing but it might be a direct hit
      const profileRes = await axios.get(
        `${trusted.serverUrl}/api/federation/feed?type=GET_CHANNEL&federatedId=${encodeURIComponent(searchInput)}`,
        {
          headers: { "x-origin-server": process.env.SERVER_NAME },
          timeout: 5000
        }
      );
      
      return res.status(200).json({ 
        success: true, 
        channels: profileRes.data.channel ? [profileRes.data.channel] : [] 
      });

    } catch (error) {
      // If remote server is unreachable or fails, return empty instead of 502
      return res.status(200).json({ 
        success: true, 
        channels: [] 
      });
    }

  } catch (err) {
    next(err);
  }
};

export const getAllChannels = async (req, res, next) => {
  try {
    const channels = await Channel.find();
    res.status(200).json({
      success: true,
      channels
    });
  }
  catch (err) {
    next(err);
  }
}

export const updateChannelDescription = async (req, res, next) => {
  try {
    const channelName = req.params.channelName;
    const { description } = req.body;
    if (!description) {
      return next(createError(400, "Description is required"));
    }
    const channel = await Channel.findOne({
      name: channelName,
      serverName: req.user.serverName
    });
    if (!channel) {
      return next(createError(404, "Channel not found"));
    }
    if (channel.isRemote) {
      return next(createError(403, "Cannot modify remote channel"));
    }
    channel.description = description;
    const updatedChannel = await channel.save();
    res.status(200).json({
      success: true,
      channel: updatedChannel
    });
  } catch (err) {
    next(err);
  }
}

export const updateChannelImage = async (req, res, next) => {
  try {
    const channelName = req.params.channelName;
    const { image } = req.body;
    if (!image) {
      return next(createError(400, "Image is required"));
    }
    const channel = await Channel.findOne({ name: channelName, serverName: req.user.serverName });
    if (!channel) {
      return next(createError(404, "Channel not found"));
    }
    if (channel.isRemote) {
      return next(createError(403, "Cannot modify remote channel"));
    }
    channel.image = image;
    const updatedChannel = await channel.save();
    res.status(200).json({
      success: true,
      channel: updatedChannel
    });
  } catch (err) {
    next(err);
  }
}

export const updateChannelRules = async (req, res, next) => {
  try {
    const channelName = req.params.channelName;
    const { rules } = req.body;
    if (!rules || !Array.isArray(rules)) {
      return next(createError(400, "Rules must be an array"));
    }
    const channel = await Channel.findOne({
      name: channelName,
      serverName: req.user.serverName
    });
    if (!channel) {
      return next(createError(404, "Channel not found"));
    }
    if (channel.isRemote) {
      return next(createError(403, "Cannot modify remote channel"));
    }
    channel.rules = rules;
    const updatedChannel = await channel.save();
    res.status(200).json({
      success: true,
      channel: updatedChannel
    });
  } catch (err) {
    next(err);
  }
}

// User actions on channels (follow/unfollow)

export const followChannel = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name, targetServer } = resolveChannelTarget(channelInput);

    if (isLocal) {
      const channel = await Channel.findOne({
        name,
        serverName: process.env.SERVER_NAME
      });

      if (!channel) {
        return next(createError(404, "Channel not found"));
      }

      if (channel.visibility === 'private' && req.user.role !== 'admin' && channel.createdBy !== req.user.federatedId) {
        return next(createError(403, "This channel is private. Please request access instead."));
      }

      await followChannelService(req.user.federatedId, channel);

      return res.status(200).json({
        success: true,
        message: `You are now following the channel: ${channel.name}`
      });
    }

    // Remote channel:
    // 1. Check local DB FIRST to prevent unnecessary remote network requests
    const channelFederatedId = channelInput; // e.g. "cricket@sports"
    const existingFollow = await ChannelFollow.findOne({
      userFederatedId: req.user.federatedId,
      channelFederatedId
    });

    if (existingFollow) {
      return next(createError(400, "Already following channel"));
    }

    // 2. Notify the remote server FIRST
    const response = await sendFederationEvent({
      type: "FOLLOW_CHANNEL",
      actorFederatedId: req.user.federatedId,
      objectFederatedId: channelInput
    });

    if (response && (response.queued || response.skipped)) {
      return next(createError(502, "Remote server is offline or unreachable. Follow failed."));
    }

    // 3. Write a local ChannelFollow so this server knows about the relationship
    await ChannelFollow.create({
      userFederatedId: req.user.federatedId,
      channelFederatedId,
      channelName: name,
      serverName: req.user.serverName,
      userOriginServer: req.user.serverName,
      channelOriginServer: targetServer,
      isRemote: true
    });

    return res.status(200).json({
      success: true,
      message: `You are now following channel: ${name} on ${targetServer}`
    });

  } catch (err) {
    next(err);
  }
};

export const unFollowChannel = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name, targetServer } = resolveChannelTarget(channelInput);

    if (isLocal) {
      const channel = await Channel.findOne({
        name,
        serverName: process.env.SERVER_NAME
      });

      if (!channel) {
        return next(createError(404, "Channel not found"));
      }

      await unFollowChannelService(req.user.federatedId, channel);

      return res.status(200).json({
        success: true,
        message: `You have unfollowed the channel: ${channel.name}`
      });
    }

    // Remote channel:
    // 1. Check local DB FIRST to prevent unnecessary remote network requests
    const channelFederatedId = channelInput;
    const existingFollow = await ChannelFollow.findOne({
      userFederatedId: req.user.federatedId,
      channelFederatedId
    });

    if (!existingFollow) {
      return next(createError(400, "Not following channel"));
    }

    // 2. Notify the remote server FIRST
    const response = await sendFederationEvent({
      type: "UNFOLLOW_CHANNEL",
      actorFederatedId: req.user.federatedId,
      objectFederatedId: channelInput
    });

    if (response && (response.queued || response.skipped)) {
      return next(createError(502, "Remote server is offline or unreachable. Unfollow failed."));
    }

    // 3. Delete local ChannelFollow record ONLY if federation succeeded
    await ChannelFollow.findOneAndDelete({
      userFederatedId: req.user.federatedId,
      channelFederatedId
    });

    return res.status(200).json({
      success: true,
      message: `You have unfollowed channel: ${name} on ${targetServer}`
    });

  } catch (err) {
    next(err);
  }
};

export const checkFollowStatus = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name, targetServer } = resolveChannelTarget(channelInput);

    let channelFederatedId;
    if (isLocal) {
      const channel = await Channel.findOne({ name, serverName: process.env.SERVER_NAME });
      if (!channel) return next(createError(404, "Channel not found"));
      channelFederatedId = channel.federatedId;
    } else {
      channelFederatedId = channelInput;
    }

    const userFederatedId = req.user.federatedId;
    const existingFollow = await ChannelFollow.findOne({
      userFederatedId,
      channelFederatedId
    });

    res.status(200).json({
      success: true,
      isFollowing: existingFollow !== null && existingFollow.status === 'active',
      status: existingFollow ? existingFollow.status : null
    });
  } catch (err) {
    next(err);
  }
};

export const getChannelFollowers = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name } = resolveChannelTarget(channelInput);

    let channelFederatedId;
    if (isLocal) {
      const channel = await Channel.findOne({ name, serverName: process.env.SERVER_NAME });
      if (!channel) return next(createError(404, "Channel not found"));
      channelFederatedId = channel.federatedId;
    } else {
      channelFederatedId = channelInput;
    }

    const followers = await ChannelFollow.find({ channelFederatedId, status: 'active' });
    res.status(200).json({
      success: true,
      followers
    });
  } catch (err) {
    next(err);
  }
};


// ── Private Channel Requests ────────────────────────────────────────────────

export const requestChannelAccess = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name, targetServer } = resolveChannelTarget(channelInput);

    if (!isLocal) {
      return next(createError(403, "Private channels must be local to this server."));
    }

    const channel = await Channel.findOne({ name, serverName: process.env.SERVER_NAME });
    if (!channel) return next(createError(404, "Channel not found"));
    if (channel.visibility !== 'private') {
      return next(createError(400, "This channel is not private. Use join instead."));
    }

    const existingRequest = await ChannelFollow.findOne({
      userFederatedId: req.user.federatedId,
      channelFederatedId: channel.federatedId
    });

    if (existingRequest) {
      return res.status(200).json({
        success: true,
        message: existingRequest.status === 'active' ? "Already a member" : "Request already pending",
        status: existingRequest.status
      });
    }

    const newRequest = new ChannelFollow({
      userFederatedId: req.user.federatedId,
      channelFederatedId: channel.federatedId,
      channelName: channel.name,
      serverName: process.env.SERVER_NAME,
      userOriginServer: req.user.serverName,
      channelOriginServer: process.env.SERVER_NAME,
      isRemote: false,
      status: 'pending'
    });

    await newRequest.save();

    res.status(200).json({
      success: true,
      message: "Access request sent successfully",
      status: 'pending'
    });
  } catch (err) {
    next(err);
  }
};

export const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await ChannelFollow.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (err) {
    next(err);
  }
};

export const handleChannelRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const request = await ChannelFollow.findById(requestId);
    if (!request) return next(createError(404, "Request not found"));

    if (action === 'approve') {
      request.status = 'active';
      await request.save();

      // Increment channel follower count
      await Channel.findOneAndUpdate(
        { federatedId: request.channelFederatedId },
        { $inc: { followersCount: 1 } }
      );

      res.status(200).json({ success: true, message: "Request approved" });
    } else {
      await ChannelFollow.findByIdAndDelete(requestId);
      res.status(200).json({ success: true, message: "Request rejected" });
    }
  } catch (err) {
    next(err);
  }
};


// --- Private Channel Access Requests (ChannelRequest-based) ---

export const requestAccess = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name } = resolveChannelTarget(channelInput);

    if (!isLocal) {
      return next(createError(400, "Federated access requests are not yet supported"));
    }

    const channel = await Channel.findOne({
      name,
      serverName: process.env.SERVER_NAME
    });

    if (!channel) {
      return next(createError(404, "Channel not found"));
    }

    if (channel.visibility !== "private") {
      return next(createError(400, "Access requests are only for private channels"));
    }

    // Check if user is already following
    const existingFollow = await ChannelFollow.findOne({
      userFederatedId: req.user.federatedId,
      channelFederatedId: channel.federatedId
    });

    if (existingFollow) {
      return next(createError(400, "You are already a member of this channel"));
    }

    // Check if request already exists
    const existingRequest = await ChannelRequest.findOne({
      channelFederatedId: channel.federatedId,
      userFederatedId: req.user.federatedId
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return next(createError(400, "You already have a pending request for this channel"));
      } else if (existingRequest.status === "rejected") {
        await ChannelRequest.deleteOne({ _id: existingRequest._id });
      }
    }

    const createdReq = await ChannelRequest.create({
      channelFederatedId: channel.federatedId,
      channelName: channel.name,
      userFederatedId: req.user.federatedId,
      userDisplayName: req.user.displayName
    });

    res.status(200).json({
      success: true,
      message: "Access request submitted successfully"
    });

  } catch (err) {
    next(err);
  }
};

export const getChannelPendingRequests = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name } = resolveChannelTarget(channelInput);

    if (!isLocal) {
      return next(createError(400, "Cannot fetch requests for remote channel"));
    }

    const channel = await Channel.findOne({
      name,
      serverName: process.env.SERVER_NAME
    });

    if (!channel) {
      return next(createError(404, "Channel not found"));
    }

    if (channel.createdBy !== req.user.federatedId && req.user.role !== "admin") {
      return next(createError(403, "Only the channel creator can view access requests"));
    }

    const requests = await ChannelRequest.find({
      channelFederatedId: channel.federatedId,
      status: "pending"
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests
    });

  } catch (err) {
    next(err);
  }
};

export const getAllPendingRequests = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return next(createError(403, "Only server admins can view all pending requests"));
    }

    const requests = await ChannelRequest.find({
      status: "pending"
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests
    });

  } catch (err) {
    next(err);
  }
};

export const checkRequestStatus = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name } = resolveChannelTarget(channelInput);

    if (!isLocal) {
      return res.status(200).json({ success: true, status: "none" });
    }

    const channel = await Channel.findOne({ name, serverName: process.env.SERVER_NAME });
    if (!channel) return next(createError(404, "Channel not found"));

    const request = await ChannelRequest.findOne({
      channelFederatedId: channel.federatedId,
      userFederatedId: req.user.federatedId
    });

    res.status(200).json({
      success: true,
      status: request ? request.status : "none"
    });

  } catch (err) {
    next(err);
  }
};

export const resolveAccessRequest = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name } = resolveChannelTarget(channelInput);
    const { userFederatedId, action } = req.body;

    if (!userFederatedId || !["approve", "reject"].includes(action)) {
      return next(createError(400, "Valid userFederatedId and action ('approve' or 'reject') are required"));
    }

    if (!isLocal) {
      return next(createError(400, "Cannot resolve requests for remote channel"));
    }

    const channel = await Channel.findOne({
      name,
      serverName: process.env.SERVER_NAME
    });

    if (!channel) {
      return next(createError(404, "Channel not found"));
    }

    if (channel.createdBy !== req.user.federatedId && req.user.role !== "admin") {
      return next(createError(403, "Only the channel creator can resolve access requests"));
    }

    const targetRequest = await ChannelRequest.findOne({
      channelFederatedId: channel.federatedId,
      userFederatedId,
      status: "pending"
    });

    if (!targetRequest) {
      return next(createError(404, "Pending request not found"));
    }

    if (action === "approve") {
      const existingFollow = await ChannelFollow.findOne({
        userFederatedId,
        channelFederatedId: channel.federatedId
      });

      if (!existingFollow) {
        await ChannelFollow.create({
          userFederatedId,
          channelFederatedId: channel.federatedId,
          channelName: channel.name,
          serverName: channel.serverName,
          userOriginServer: userFederatedId.split("@")[1] || process.env.SERVER_NAME,
          channelOriginServer: channel.serverName
        });

        // Increment channel follower count
        await Channel.findOneAndUpdate(
          { federatedId: channel.federatedId },
          { $inc: { followersCount: 1 } }
        );
      }

      await ChannelRequest.deleteOne({ _id: targetRequest._id });

    } else if (action === "reject") {
      targetRequest.status = "rejected";
      await targetRequest.save();
    }

    res.status(200).json({
      success: true,
      message: `Request ${action}d successfully`
    });

  } catch (err) {
    next(err);
  }
};




