import Post from "../models/Post.js";
import TrustedServer from "../models/TrustedServer.js";
import axios from "axios";

/*
  Create Post Business Logic
  Used by:
  - Controller
  - Federation Inbox (remote post replication)
*/
export const createPostService = async ({
  description,
  image,
  images,
  isUserPost,
  userDisplayName,
  authorFederatedId,
  isChannelPost,
  channelName,
  federatedId,
  originServer,
  serverName,
  isRemote = false,
  isRepost = false,
  originalPostFederatedId = null,
  originalAuthorFederatedId = null
}) => {
  const newPost = new Post({
    description,
    image: image || null,
    images: images || [],
    isUserPost,
    userDisplayName,
    authorFederatedId,
    isRepost,
    originalPostFederatedId: isRepost ? originalPostFederatedId : federatedId,
    originalAuthorFederatedId: isRepost ? originalAuthorFederatedId : authorFederatedId,
    isChannelPost: !!isChannelPost,
    channelName: isChannelPost ? channelName : null,
    federatedId,
    originServer: (originServer || process.env.SERVER_NAME).toLowerCase(),
    serverName: (serverName || originServer || process.env.SERVER_NAME).toLowerCase(),
    isRemote: !!isRemote,
    federationStatus: isRemote ? "received" : "local",
    federatedTo: []
  });

  return await newPost.save();
};


/*
  Delete Post Business Logic
  Used by:
  - Controller
  - Federation Inbox (future delete forwarding)
*/
export const deletePostService = async (post) => {
    return await Post.findByIdAndDelete(post._id);
};


/*
  Like / Unlike Post Business Logic
  Used by:
  - Controller
  - Federation Inbox (remote like handling)
*/
export const toggleLikePostService = async (post, actorFederatedId) => {

    const alreadyLiked = post.likedBy.includes(actorFederatedId);

    if (alreadyLiked) {
        post.likedBy.pull(actorFederatedId);
        post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
        post.likedBy.push(actorFederatedId);
        post.likeCount += 1;
    }

    await post.save();

    return {
        liked: !alreadyLiked,
        likeCount: post.likeCount
    };
};


/*
  Add Comment Business Logic
  Used by:
  - Controller
  - Federation Inbox (remote comment replication)
*/
export const addCommentService = async (post, {
    displayName,
    image,
    content,
    commentFederatedId,
    originServer
}) => {

    const newComment = {
        displayName,
        image: image || null,
        content,
        commentFederatedId,
        originServer
    };

    post.comments.push(newComment);
    await post.save();

    return newComment;
};


/**
 * Shared service for retrieving posts for a specific list of users/channels.
 * Used by postController (local timeline) and federationFeedController (remote timeline fetch).
 */
export const getPostsByIdsService = async (userIds = [], channelIds = []) => {
    const orClauses = [];
    if (userIds.length) orClauses.push({ authorFederatedId: { $in: userIds }, isUserPost: true });
    if (channelIds.length) {
        const channelNames = channelIds.map(id => id.split("@")[0]);
        orClauses.push({
            isChannelPost: true,
            channelName: { $in: channelNames.map(name => new RegExp(`^${name}$`, "i")) },
            serverName: process.env.SERVER_NAME.toLowerCase()
        });
    }

    if (!orClauses.length) return [];

    return await Post.find({ $or: orClauses })
        .sort({ createdAt: -1 })
        .limit(10);
};

/**
 * Synchronizes posts from a remote channel into the local database.
 * Used proactively when a user views a remote channel.
 */
export const syncRemoteChannelPosts = async (name, targetServer) => {
  try {
    const trusted = await TrustedServer.findOne({
      serverName: { $regex: new RegExp("^" + targetServer + "$", "i") },
      isActive: true
    });

    if (!trusted) return;

    const { data } = await axios.get(
      `${trusted.serverUrl}/api/federation/feed?type=GET_CHANNEL_POSTS&channelName=${name}&limit=20`,
      {
        headers: { "x-origin-server": process.env.SERVER_NAME },
        timeout: 4000
      }
    );

    if (data.success && Array.isArray(data.posts)) {
      for (const p of data.posts) {
        if (!p.federatedId) continue;
        await Post.findOneAndUpdate(
          { federatedId: p.federatedId },
          { 
            $set: { 
              ...p, 
              isRemote: true,
              federationStatus: "received"
            } 
          },
          { upsert: true }
        );
      }
    }
  } catch (error) {
    console.error(`Sync failed for ${name}@${targetServer}:`, error.message);
  }
};
