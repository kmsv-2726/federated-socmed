import { createError } from "../utils/error.js";
import Post from "../models/Post.js";

export const createPost = async (req, res, next) => {
  try {
    const { description, image, isChannelPost, channelName } = req.body;
    if (!description || description.trim() === "") {
      return next(createError(400, "Post description is required"));
    }
    const isUserPost = !isChannelPost;

    if (isChannelPost && !channelName) {
      return next(createError(400, "Channel name is required for channel posts"));
    }

    const postFederatedId = `${req.user.federatedId}/post/${Date.now()}`;

    const newPost = new Post({
      description,
      image: image || null,

      isUserPost,
      userDisplayName: isUserPost ? req.user.displayName : null,

      isChannelPost: !!isChannelPost,
      channelName: isChannelPost ? channelName : null,

      federatedId: postFederatedId,
      originServer: req.user.server,
      serverName: req.user.server,

      // Federation
      isRemote: false,
      federationStatus: "local",
      federatedTo: [],
    });

    const savedPost = await newPost.save();

    res.status(200).json({
      success: true,
      post: savedPost
    });

    // federatePost(savedPost, req.user.followers);

  } catch (err) {
    next(err);
  }
};

export const deletePost = async (req, res, next) => {
    // Implementation for deleting a post
};  

export const likePost = async (req, res, next) => {
    // Implementation for liking a post
}