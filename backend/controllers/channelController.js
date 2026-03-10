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

    // ── 1. Local Channel ─────────────────────────────────────────────────────
    if (isLocal) {
      const channel = await getChannelProfileService(searchInput);
      return res.status(200).json({ success: true, channels: channel });
    }

    // ── 2. Remote Channel (Federated Search/View) ────────────────────────────
    const trusted = await TrustedServer.findOne({ serverName: targetServer, isActive: true });
    if (!trusted) {
      return next(createError(403, `Server ${targetServer} is not trusted or offline`));
    }

    try {
      const { data } = await axios.get(
        `${trusted.serverUrl}/api/federation/feed?type=GET_CHANNEL&federatedId=${searchInput}`,
        {
          headers: { "x-origin-server": process.env.SERVER_NAME },
          timeout: 5000
        }
      );
      // The frontend expects the result in a "channels" key (legacy naming)
      return res.status(200).json({ success: true, channels: data.channel });
    } catch (error) {
      return next(createError(502, "Failed to fetch remote channel profile"));
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
      channelOriginServer: targetServer
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
    const channelName = req.params.channelName;
    const channel = await Channel.findOne({ name: channelName, serverName: req.user.serverName });
    if (!channel) {
      return next(createError(404, "Channel not found"));
    }
    const userFederatedId = req.user.federatedId;
    const existingFollow = await ChannelFollow.findOne({
      userFederatedId,
      channelFederatedId: channel.federatedId
    });
    res.status(200).json({
      success: true,
      isFollowing: existingFollow !== null
    });
  } catch (err) {
    next(err);
  }
};

export const getChannelFollowers = async (req, res, next) => {
  try {
    const channelName = req.params.channelName;
    const channel = await Channel.findOne({ name: channelName, serverName: req.user.serverName });
    if (!channel) {
      return next(createError(404, "Channel not found"));
    }
    const followers = await ChannelFollow.find({ channelFederatedId: channel.federatedId });
    res.status(200).json({
      success: true,
      followers
    });
  } catch (err) {
    next(err);
  }
};




// --- Private Channel Access Requests ---

export const requestAccess = async (req, res, next) => {
  try {
    const channelInput = req.params.channelName;
    const { isLocal, name, targetServer } = resolveChannelTarget(channelInput);

    if (!isLocal) {
      console.log("Cannot request federated access right now.");
      return next(createError(400, "Federated access requests are not yet supported"));
    }

    const channel = await Channel.findOne({
      name,
      serverName: process.env.SERVER_NAME
    });

    if (!channel) {
      console.log("Channel not found locally:", name);
      return next(createError(404, "Channel not found"));
    }

    if (channel.visibility !== "private") {
      console.log("Channel is not private:", channel.visibility);
      return next(createError(400, "Access requests are only for private channels"));
    }

    // Check if user is already following
    const existingFollow = await ChannelFollow.findOne({
      userFederatedId: req.user.federatedId,
      channelFederatedId: channel.federatedId
    });

    if (existingFollow) {
      console.log("User is already following:", req.user.federatedId);
      return next(createError(400, "You are already a member of this channel"));
    }

    // Check if request already exists
    const existingRequest = await ChannelRequest.findOne({
      channelFederatedId: channel.federatedId,
      userFederatedId: req.user.federatedId
    });

    if (existingRequest) {
      console.log("Existing request found. Status:", existingRequest.status);
      if (existingRequest.status === "pending") {
        return next(createError(400, "You already have a pending request for this channel"));
      } else if (existingRequest.status === "rejected") {
        // Allow re-requesting after rejection — delete old rejected request first
        await ChannelRequest.deleteOne({ _id: existingRequest._id });
      }
    }
    /*
        console.log("Attempting to insert ChannelRequest into database:", {
          channelFederatedId: channel.federatedId,
          channelName: channel.name,
          userFederatedId: req.user.federatedId,
          userDisplayName: req.user.displayName
        }); */

    // Create request
    const createdReq = await ChannelRequest.create({
      channelFederatedId: channel.federatedId,
      channelName: channel.name,
      userFederatedId: req.user.federatedId,
      userDisplayName: req.user.displayName
    });

    console.log("ChannelRequest created successfully:", createdReq._id);

    res.status(200).json({
      success: true,
      message: "Access request submitted successfully"
    });

  } catch (err) {
    console.error("Error creating channel request:", err);
    next(err);
  }
};

export const getPendingRequests = async (req, res, next) => {
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

    // Only channel creator (or admin) can view requests
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
      return res.status(200).json({ success: true, status: "none" }); // Fallback
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
    const { userFederatedId, action } = req.body; // action: "approve" | "reject"

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

    // Only channel creator (or admin) can resolve requests
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
      // 1. Create a ChannelFollow
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
          userOriginServer: userFederatedId.split("@")[1] || process.env.SERVER_NAME, // Approximation for origin
          channelOriginServer: channel.serverName
        });
      }

      // 2. Mark as approved or delete request
      // We will delete it here so they can request again if they leave
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