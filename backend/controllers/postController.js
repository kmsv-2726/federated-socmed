import { createError } from "../utils/error.js";
import Post from "../models/Post.js";
import { use } from "react";

export const createPost = async (req, res, next) => {
  try {
    const { description, image, isChannelPost, channelName, isRemote } = req.body;
    if (!description || description.trim() === "") {
      return next(createError(400, "Post description is required"));
    }
    const isUserPost = !isChannelPost;

    if (isChannelPost && !channelName) {
      return next(createError(400, "Channel name is required for channel posts"));
    }


    console.log("Authenticated user:", req.user);
    let postFederatedId;
    if(isChannelPost){
      postFederatedId = `${channelName}@${req.user.server}/post/${Date.now()}`;
    }else{
      postFederatedId = `${req.user.federatedId}/post/${Date.now()}`;
    }

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
    try{
      const postId = req.params.id;
      const post = await Post.findById(postId);
      if(!post){
        return next(createError(404, "Post not found"));
      }
      await Post.findByIdAndDelete(postId);
      res.status(200).json({
        success: true,
        message: "Post deleted successfully"
      });
    }catch(err){
        next(err);
    }
};  

export const likePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.federatedId;

    const post = await Post.findById(postId);
    if (!post) {
      return next(createError(404, "Post not found"));
    }

    const alreadyLiked = post.likedBy.includes(userId);

    if (alreadyLiked) {
      post.likedBy.pull(userId);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likedBy.push(userId);
      post.likeCount += 1;
    }

    await post.save();

    return res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      likeCount: post.likeCount
    });
  } catch (err) {
    return next(err);
  }
};

export const getPosts = async (req,res,next) =>{
  try{
    const posts = await Post.find().sort({createdAt:-1});
    res.status(200).json({
      success:true,
      posts
    });
  }catch(err){
    next(err);
  }
}


export const createComment = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return next(createError(400, "Comment content is required"));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(createError(404, "Post not found"));
    }

    const newComment = {
      displayName: req.user.displayName,       
      image: req.user.image || null,    
      content: content.trim()
    };

    console.log(req.user);

    post.comments.push(newComment);
    await post.save();

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
};
