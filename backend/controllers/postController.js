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
import UserMute from "../models/UserMute.js";
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
    let postFederatedId;
    let originServer = req.user.serverName;
    let isRemote = false;

    if (isChannelPost) {
      if (!channelName) {
        return next(createError(400, "Channel name is required for channel posts"));
      }

      if (channelName.includes("@")) {
        const [name, targetServer] = channelName.split("@");

        if (targetServer === req.user.serverName) {
          // It's actually a local channel despite having @
          const channel = await Channel.findOne({
            name: name,
            serverName: req.user.serverName
          });

          if (!channel) {
            return next(createError(404, "Channel not found"));
          }

          postFederatedId = `${name}@${req.user.serverName}/post/${Date.now()}`;
        } else {
          // REMOTE CHANNEL CASE
          isRemote = true;
          originServer = targetServer;
          postFederatedId = `${name}@${targetServer}/post/${Date.now()}`;

          // 1. Notify the remote server FIRST
          const response = await sendFederationEvent({
            type: "CREATE_POST",
            actorFederatedId: req.user.federatedId,
            objectFederatedId: postFederatedId,
            data: {
              description: description.trim(),
              image,
              images,
              isChannelPost: true,
              channelName: name,
              userDisplayName: req.user.displayName,
              isRepost: req.body.isRepost || false,
              originalPostFederatedId: req.body.originalPostFederatedId || null,
              originalAuthorFederatedId: req.body.originalAuthorFederatedId || null
            }
          });

          if (response && (response.queued || response.skipped)) {
            return next(createError(502, "Remote server is offline or unreachable. Post failed."));
          }

          // 2. Write local record ONLY if federation succeeded
          const savedPost = await createPostService({
            description: description.trim(),
            image,
            images,
            isUserPost: false,
            userDisplayName: req.user.displayName,
            authorFederatedId: req.user.federatedId,
            isChannelPost: true,
            channelName: name,
            federatedId: postFederatedId,
            originServer,
            isRemote: true
          });

          return res.status(201).json({ success: true, post: savedPost });
        }
      } else {
        // LOCAL CHANNEL CASE
        const channel = await Channel.findOne({
          name: channelName,
          serverName: req.user.serverName
        });

        if (!channel) {
          return next(createError(404, "Channel not found"));
        }

        postFederatedId = `${channelName}@${req.user.serverName}/post/${Date.now()}`;
      }
    } else {
      // USER POST CASE
      postFederatedId = `${req.user.federatedId}/post/${Date.now()}`;
    }

    // Local Case: User Post or Local Channel Post
    const savedPost = await createPostService({
      description: description.trim(),
      image,
      images,
      isUserPost,
      userDisplayName: req.user.displayName,
      authorFederatedId: req.user.federatedId,
      isChannelPost,
      channelName,
      federatedId: postFederatedId,
      originServer,
      isRemote: false
    });

    res.status(201).json({ success: true, post: savedPost });
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
      // 1. Notify the remote server FIRST
      const response = await sendFederationEvent({
        type: "DELETE_POST",
        actorFederatedId: req.user.federatedId,
        objectFederatedId: post.federatedId,
        data: {
          postId: post._id
        }
      });

      if (response && (response.queued || response.skipped)) {
        return next(createError(502, "Remote server is offline or unreachable. Delete failed."));
      }

      // 2. Delete local copy ONLY if federation succeeded
      await deletePostService(post);

      return res.status(200).json({
        success: true,
        message: "Remote post deleted successfully"
      });
    }

    // LOCAL POST CASE
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

    // Filter out posts from users the current user has muted
    if (req.user && req.user.federatedId) {
      const mutes = await UserMute.find({ muterFederatedId: req.user.federatedId });
      if (mutes.length > 0) {
        const mutedIds = mutes.map(m => m.mutedFederatedId);
        query.authorFederatedId = query.authorFederatedId
          ? { $eq: query.authorFederatedId, $nin: mutedIds }
          : { $nin: mutedIds };
      }
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


export const repostPost = async (req, res, next) => {
  try {
    const { postFederatedId } = req.body;

    if (!postFederatedId) {
      return next(createError(400, "Original post federated ID is required"));
    }

    let originalPost = await Post.findOne({ federatedId: postFederatedId });

    // If not found locally, fetch from remote
    if (!originalPost) {
      const parts = postFederatedId.split("/post/");
      if (parts.length !== 2) {
        return next(createError(400, "Invalid post federated ID"));
      }

      const serverPart = parts[0];
      const originServer = serverPart.includes("@") ? serverPart.split("@")[1] : serverPart;

      const trusted = await TrustedServer.findOne({ serverName: originServer, isActive: true });
      if (!trusted) {
        return next(createError(403, `Origin server ${originServer} is not trusted or offline`));
      }

      try {
        const { data } = await axios.get(
          `${trusted.serverUrl}/api/federation/feed?type=GET_POSTS&federatedId=${postFederatedId}`,
          {
            headers: { "x-origin-server": process.env.SERVER_NAME },
            timeout: 5000
          }
        );

        if (data.posts && data.posts.length > 0) {
          originalPost = data.posts[0];
        } else {
          return next(createError(404, "Original post not found on remote server"));
        }
      } catch (error) {
        return next(createError(502, "Failed to fetch original post from remote server"));
      }
    }

    // Resolve true original post if the post being reposted is itself a repost
    const trueOriginalPostId = originalPost.isRepost ? originalPost.originalPostFederatedId : originalPost.federatedId;
    const originalAuthorFederatedId = originalPost.isRepost ? originalPost.originalAuthorFederatedId : originalPost.authorFederatedId;

    // Prevent double reposting of the SAME root post
    const existingRepost = await Post.findOne({
      authorFederatedId: req.user.federatedId,
      isRepost: true,
      originalPostFederatedId: trueOriginalPostId
    });

    if (existingRepost) {
      return next(createError(400, "You have already reposted this post"));
    }

    const newPostFederatedId = `${req.user.federatedId}/post/${Date.now()}`;

    // Create the repost locally
    const savedRepost = await createPostService({
      description: originalPost.description,
      image: originalPost.image,
      images: originalPost.images,
      isUserPost: true,
      userDisplayName: req.user.displayName,
      authorFederatedId: req.user.federatedId,
      isChannelPost: false,
      channelName: null,
      federatedId: newPostFederatedId,
      originServer: req.user.serverName,
      isRemote: false,
      isRepost: true,
      originalPostFederatedId: trueOriginalPostId,
      originalAuthorFederatedId
    });

    res.status(201).json({
      success: true,
      post: savedRepost
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

    // ── 1. Fetch all follow relationships and mutes for this user ──────────────────────
    const [userFollows, channelFollows, userMutes] = await Promise.all([
      UserFollow.find({ followerFederatedId: userId }),
      ChannelFollow.find({ userFederatedId: userId }),
      UserMute.find({ muterFederatedId: userId })
    ]);

    const mutedFederatedIds = new Set(userMutes.map(m => m.mutedFederatedId));

    // ── 2. Split into local vs remote ────────────────────────────────────────
    const localUserIds = [];
    const remoteUserMap = {}; // { serverName: [federatedId, ...] }

    for (const f of userFollows) {
      if (mutedFederatedIds.has(f.followingFederatedId)) continue; // skip if muted

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
        return (data.posts || []).map(p => ({ ...p, isRemote: true }));
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

    // ── 7. Deduplicate Reposts ───────────────────────────────────────────────
    // If multiple followed users repost the same original content, only show it once.
    const seenRootIds = new Set();
    const deduplicatedFeed = [];

    for (const post of combined) {
      const rootId = post.isRepost ? post.originalPostFederatedId : post.federatedId;
      if (!seenRootIds.has(rootId)) {
        seenRootIds.add(rootId);
        deduplicatedFeed.push(post);
      }
    }

    return res.status(200).json({
      success: true,
      total: deduplicatedFeed.length,
      posts: deduplicatedFeed
    });

  } catch (err) {
    next(err);
  }
};