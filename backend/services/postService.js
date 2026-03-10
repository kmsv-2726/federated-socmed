import Post from "../models/Post.js";

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
    userDisplayName: userDisplayName,
    authorFederatedId: authorFederatedId,

    isRepost,
    originalPostFederatedId: isRepost ? originalPostFederatedId : federatedId,
    originalAuthorFederatedId: isRepost ? originalAuthorFederatedId : authorFederatedId,

    isChannelPost: !!isChannelPost,
    channelName: isChannelPost ? channelName : null,

    federatedId,
    originServer,
    serverName: originServer,

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
      channelName: { $in: channelNames },
      originServer: process.env.SERVER_NAME
    });
  }

  if (!orClauses.length) return [];

  return await Post.find({ $or: orClauses })
    .sort({ createdAt: -1 })
    .limit(10);
};
