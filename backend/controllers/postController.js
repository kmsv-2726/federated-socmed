import { createError } from "../utils/error.js";
import Post from "../models/Post.js";
import Channel from "../models/Channel.js";
import {
  createPostService,
  deletePostService,
  toggleLikePostService,
  addCommentService
} from "../services/postService.js";
import { sendFederationEvent } from "../services/federationService.js";
import UserFollow from "../models/UserFollow.js";
import ChannelFollow from "../models/ChannelFollow.js";
import TrustedServer from "../models/TrustedServer.js";
import axios from "axios";


export const createPost = async (req, res, next) => {
  try {
    const { description, image, images, isChannelPost, channelName } = req.body;

    if (!description || description.trim() === "") {
      return next(createError(400, "Post description is required"));
    }

    // handle images - support both single image and array
    let imageList = [];
    if (images && Array.isArray(images)) {
      imageList = images.slice(0, 4); // max 4
    } else if (image) {
      imageList = [image];
    }

    const isUserPost = !isChannelPost;

    let channel = null;

    // Channel validation remains in controller (HTTP validation layer)
    if (isChannelPost) {
      if (!channelName) {
        return next(createError(400, "Channel name is required for channel posts"));
      }

      channel = await Channel.findOne({
        name: channelName,
        serverName: req.user.serverName
      });

      if (!channel) {
        return next(createError(404, "Channel not found"));
      }

      if (channel.isRemote) {
        return next(createError(403, "Cannot post directly to a remote channel"));
      }

      if (channel.visibility === "read-only" && req.user.role !== "admin") {
        return next(createError(403, "This channel is read-only"));
      }

      if (channel.visibility === "private") {
        return next(createError(403, "This channel is private"));
      }

      // Check against channel's custom banned words list
      if (channel.bannedWords && channel.bannedWords.length > 0) {
        const lowercaseDesc = description.toLowerCase();
        const containsBannedWord = channel.bannedWords.some(word => lowercaseDesc.includes(word.toLowerCase()));

        if (containsBannedWord) {
          return next(createError(400, `Your post contains terminology banned by the '${channelName}' channel.`));
        }
      }
    } else { // If it's a user post, description is still required
      if (!description || description.trim() === "") {
        return next(createError(400, "Post description is required"));
      }
    }

    // Federated ID generation stays here (request context logic)
    let postFederatedId;
    if (isChannelPost) {
      postFederatedId = `${channelName}@${req.user.serverName}/post/${Date.now()}`;
    } else {
      postFederatedId = `${req.user.federatedId}/post/${Date.now()}`;
    }

    // Delegate DB creation to service layer
    const savedPost = await createPostService({
      description: description.trim(),
      image: imageList.length > 0 ? imageList[0] : null,
      images: imageList,
      isUserPost,
      userDisplayName: req.user.displayName,
      authorFederatedId: req.user.federatedId,
      isChannelPost,
      channelName,
      federatedId: postFederatedId,
      originServer: req.user.serverName
    });

    res.status(201).json({
      success: true,
      post: savedPost
    });

  } catch (err) {
    next(err);
  }
};


export const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return next(createError(404, "Post not found"));
    }

    if (post.isRemote) {
      return next(createError(403, "Cannot modify remote content"));
    }

    // Use federatedId (stable) instead of displayName (mutable) for ownership check
    if (
      post.authorFederatedId !== req.user.federatedId &&
      req.user.role !== "admin"
    ) {
      return next(createError(403, "Unauthorized action"));
    }

    // Delegate deletion to service
    await deletePostService(post);

    res.status(200).json({
      success: true,
      message: "Post deleted successfully"
    });

  } catch (err) {
    next(err);
  }
};


export const likePost = async (req, res, next) => {
  try {
    const federatedId = req.body.postFederatedId;
    const userId = req.user.federatedId;

    const [serverPart] = federatedId.split("/post/");
    const postServer = serverPart.split("@")[1];

    if (postServer !== process.env.SERVER_NAME) {
      // Remote post - send federation event
      // The remote server's likedBy array handles deduplication via toggleLikePostService
      await sendFederationEvent({
        type: "LIKE_POST",
        actorFederatedId: userId,
        objectFederatedId: federatedId
      });
      return res.status(200).json({
        success: true,
        message: "Like event sent to remote server"
      });
    }

    const post = await Post.findOne({ federatedId });

    if (!post) {
      return next(createError(404, "Post not found"));
    }
    if (post.isRemote) {
      return next(createError(403, "Cannot modify remote content"));
    }

    // Delegate like/unlike logic to service
    const result = await toggleLikePostService(post, userId);

    return res.status(200).json({
      success: true,
      liked: result.liked,
      likeCount: result.likeCount
    });

  } catch (err) {
    return next(err);
  }
};


export const getPosts = async (req, res, next) => {
  try {
    const { authorFederatedId } = req.query;

    const query = {};
    if (authorFederatedId) {
      query.authorFederatedId = authorFederatedId;
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      posts
    });

  } catch (err) {
    next(err);
  }
};


export const createComment = async (req, res, next) => {
  try {
    const [channelServer, postPath] = req.body.postFederatedId.split("/post/");
    const [channel, server] = channelServer.split("@");
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return next(createError(400, "Comment content is required"));
    }

    if (server !== process.env.SERVER_NAME) {
      // If the post is remote, forward the comment to the remote server
      const remoteResponse = await sendFederationEvent({
        type: "COMMENT_POST",
        actorFederatedId: req.user.federatedId,
        objectFederatedId: req.body.postFederatedId,
        data: {
          content: content.trim()
        }
      });

      return res.status(200).json({
        success: true,
        remoteResponse
      });
    }

    // Generate federated comment ID in controller
    const post = await Post.findOne({ federatedId: req.body.postFederatedId });
    if (!post) {
      return next(createError(404, "Post not found"));
    }

    const commentFederatedId =
      `${req.user.federatedId}/comment/${Date.now()}`;

    // Delegate comment creation to service
    await addCommentService(post, {
      displayName: req.user.displayName,
      image: req.user.image,
      content: content.trim(),
      commentFederatedId,
      originServer: req.user.serverName
    });

    res.status(200).json({
      success: true,
      commentFederatedId
    });

  } catch (err) {
    next(err);
  }
};




/**
 * GET /api/posts/timeline
 * Returns a personalised feed for the logged-in user:
 *   - Up to 10 posts from local users they follow
 *   - Up to 10 posts from local channels they follow
 *   - Up to 10 posts from remote users they follow (one HTTP call per remote server)
 *   - Up to 10 posts from remote channels they follow (one HTTP call per remote server)
 * All results are merged and returned in a random shuffled order.
 */
export const getTimeline = async (req, res, next) => {
  try {
    const userId = req.user.federatedId;

    // ── 1. Fetch all follow relationships for this user ──────────────────────
    const [userFollows, channelFollows] = await Promise.all([
      UserFollow.find({ followerFederatedId: userId }),
      ChannelFollow.find({ userFederatedId: userId })
    ]);

    // ── 2. Split into local vs remote ────────────────────────────────────────
    const localUserIds = [];
    const remoteUserMap = {}; // { serverName: [federatedId, ...] }

    for (const f of userFollows) {
      if (f.followingOriginServer === process.env.SERVER_NAME) {
        localUserIds.push(f.followingFederatedId);
      } else {
        if (!remoteUserMap[f.followingOriginServer]) remoteUserMap[f.followingOriginServer] = [];
        remoteUserMap[f.followingOriginServer].push(f.followingFederatedId);
      }
    }

    const localChannelIds = [];
    const remoteChannelMap = {}; // { serverName: [channelFederatedId, ...] }

    for (const f of channelFollows) {
      if (f.channelOriginServer === process.env.SERVER_NAME) {
        localChannelIds.push(f.channelFederatedId);
      } else {
        if (!remoteChannelMap[f.channelOriginServer]) remoteChannelMap[f.channelOriginServer] = [];
        remoteChannelMap[f.channelOriginServer].push(f.channelFederatedId);
      }
    }

    // ── 3. Local queries (run in parallel) ───────────────────────────────────
    const localPostsPromise = localUserIds.length
      ? Post.find({ authorFederatedId: { $in: localUserIds }, isUserPost: true }).sort({ createdAt: -1 }).limit(10)
      : Promise.resolve([]);

    const localChannelNames = localChannelIds.map(id => id.split("@")[0]);
    const localChannelPostsPromise = localChannelNames.length
      ? Post.find({
        isChannelPost: true,
        channelName: { $in: localChannelNames },
        originServer: process.env.SERVER_NAME
      }).sort({ createdAt: -1 }).limit(10)
      : Promise.resolve([]);

    // ── 4. Remote queries ─────────────────────────────────────────────────────
    // Collect all unique remote server names
    const allRemoteServers = new Set([
      ...Object.keys(remoteUserMap),
      ...Object.keys(remoteChannelMap)
    ]);

    // For each remote server: one HTTP call with both user IDs and channel IDs
    const remotePostPromises = [...allRemoteServers].map(async (serverName) => {
      try {
        const trusted = await TrustedServer.findOne({ serverName, isActive: true });
        if (!trusted) return [];

        const params = new URLSearchParams();
        if (remoteUserMap[serverName]?.length) params.set("userIds", remoteUserMap[serverName].join(","));
        if (remoteChannelMap[serverName]?.length) params.set("channelIds", remoteChannelMap[serverName].join(","));

        params.set("type", "GET_POSTS");

        const { data } = await axios.get(
          `${trusted.serverUrl}/api/federation/feed?${params.toString()}`,
          {
            headers: { "x-origin-server": process.env.SERVER_NAME },
            timeout: 4000
          }
        );
        return data.posts || [];
      } catch {
        return []; // If remote server is offline, skip gracefully
      }
    });

    // ── 5. Await everything in parallel ──────────────────────────────────────
    const [
      localUserPosts,
      localChannelPosts,
      ...remoteResultArrays
    ] = await Promise.all([
      localPostsPromise,
      localChannelPostsPromise,
      ...remotePostPromises
    ]);

    // Flatten remote results and split into first 10 user posts + 10 channel posts
    const allRemotePosts = remoteResultArrays.flat();
    const remoteUserPosts = allRemotePosts.filter(p => !p.channelName).slice(0, 10);
    const remoteChannelPosts = allRemotePosts.filter(p => !!p.channelName).slice(0, 10);

    // ── 6. Merge all four buckets and shuffle ────────────────────────────────
    const combined = [
      ...localUserPosts,
      ...localChannelPosts,
      ...remoteUserPosts,
      ...remoteChannelPosts
    ];

    // Fisher-Yates shuffle for a random feed order
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return res.status(200).json({
      success: true,
      total: combined.length,
      posts: combined
    });

  } catch (err) {
    next(err);
  }
};