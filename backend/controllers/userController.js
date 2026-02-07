import User from "../models/User.js";
import UserFollow from "../models/UserFollow.js";
import { createError } from "../utils/error.js";

export const getUserProfile = async (req,res,next) =>{
    try{
        const federatedId = req.params.federatedId;
        const user = await User.findOne({federatedId : federatedId});
        if(!user){
            return next(createError(404, "User not found"));
        }
        res.status(200).json({
            success: true,
            user
        });
    }catch(err){
        next(err);
    }
}

export const followUser = async (req,res,next) =>{
    try{
        const targetFederatedId = req.params.federatedId;
        const userId = req.user.federatedId;
        if(targetFederatedId === userId){
            return next(createError(400, "You cannot follow yourself"));
        }

        const FollowStatus = await UserFollow.findOne({followerFederatedId: userId, followingFederatedId: targetFederatedId});
        if(FollowStatus){
            return next(createError(400, "You are already following this user"));
        }

        const newFollow = new UserFollow({
            followerFederatedId: userId,
            followingFederatedId: targetFederatedId
        });
        await newFollow.save();

        await User.findOneAndUpdate({federatedId: userId}, {$inc: {followingCount: 1}});
        await User.findOneAndUpdate({federatedId: targetFederatedId}, {$inc: {followersCount: 1}});

        res.status(200).json({
            success: true,
            message: "User followed successfully"
        });
    }catch(err){
        next(err);
    }   
}

export const unfollowUser = async (req,res,next) =>{
    try{
        const targetFederatedId = req.params.federatedId;
        const userId = req.user.federatedId;    

        if(targetFederatedId === userId){
            return next(createError(400, "You cannot unfollow yourself"));
        }

        const FollowStatus = await UserFollow.findOne({followerFederatedId: userId, followingFederatedId: targetFederatedId});
        if(!FollowStatus){
            return next(createError(400, "You are not following this user"));
        }

        await UserFollow.findOneAndDelete({followerFederatedId: userId, followingFederatedId: targetFederatedId});
        await User.findOneAndUpdate({federatedId: userId}, {$inc: {followingCount: -1}});
        await User.findOneAndUpdate({federatedId: targetFederatedId}, {$inc: {followersCount: -1}});

        res.status(200).json({
            success: true,
            message: "User unfollowed successfully"
        });
    }catch(err){
        next(err);
    }   
}

export const checkFollowStatus = async (req,res,next) =>{
    try{
        const targetFederatedId = req.params.federatedId;
        const userId = req.user.federatedId;
        if(targetFederatedId === userId){
            return next(createError(400, "You cannot check follow status for yourself"));
        }

        const FollowStatus = await UserFollow.findOne({followerFederatedId: userId, followingFederatedId: targetFederatedId});
        res.status(200).json({
            success: true,
            isFollowing: !!FollowStatus
        });
    }catch(err){
        next(err);
    } 
}

export const getMyFollowers = async (req,res,next) =>{
    try{
        const userId = req.user.federatedId;
        const follow = await UserFollow.find({followingFederatedId : userId});
        const followerIds = follow.map(f => f.followerFederatedId);
        const followers = await User.find(
            { federatedId: { $in: followerIds } },
            { displayName: 1, avatarUrl: 1, federatedId: 1 }
        );

        res.status(200).json({
            success: true,
            followers
        });
    }catch(err){
        next(err);
    }
}

export const getMyFollowing = async (req,res,next) =>{
    try{
        const userId = req.user.federatedId;
        const follow = await UserFollow.find({followerFederatedId : userId});
        const followingIds = follow.map(f => f.followingFederatedId);
        const following = await User.find(
            { federatedId: { $in: followingIds } },
            { displayName: 1, avatarUrl: 1, federatedId: 1 }
        );
    }catch(err){
        next(err);
    }
}

