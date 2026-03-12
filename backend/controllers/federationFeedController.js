import { createError } from "../utils/error.js";
import { getPostsByIdsService } from "../services/postService.js";
import { getUserProfileService, searchUsersService } from "../services/userService.js";
import { getChannelProfileService, searchChannelsService } from "../services/channelService.js";
import Post from "../models/Post.js";

/**
 * Unified controller for all server-to-server Read Feed requests.
 * Handled via GET /api/federation/feed?type=...
 * Protected by verifyFederatedServer middleware.
 */
export const federationFeed = async (req, res, next) => {
    try {
        const { type } = req.query;

        switch (type) {
            case "GET_POSTS": {
                const userIds = req.query.userIds ? req.query.userIds.split(",") : [];
                const channelIds = req.query.channelIds ? req.query.channelIds.split(",") : [];
                const posts = await getPostsByIdsService(userIds, channelIds);
                return res.status(200).json({ success: true, posts });
            }

            case "GET_PROFILE": {
                const { federatedId } = req.query;
                if (!federatedId) return next(createError(400, "federatedId is required"));
                const user = await getUserProfileService(federatedId);
                return res.status(200).json({ success: true, user });
            }

            case "GET_CHANNEL": {
                const { federatedId } = req.query;
                if (!federatedId) return next(createError(400, "federatedId is required"));
                const channel = await getChannelProfileService(federatedId);
                return res.status(200).json({ success: true, channel });
            }

            case "SEARCH_USERS": {
                const { query } = req.query;
                if (!query) return next(createError(400, "query is required"));
                const users = await searchUsersService(query);
                return res.status(200).json({ success: true, users });
            }

            case "SEARCH_CHANNELS": {
                const { query } = req.query;
                if (!query) return next(createError(400, "query is required"));
                const channels = await searchChannelsService(query);
                return res.status(200).json({ success: true, channels });
            }

            case "GET_CHANNEL_POSTS": {
                const { channelName } = req.query;
                const limit = parseInt(req.query.limit) || 10;
                const page = parseInt(req.query.page) || 1;
                const skip = (page - 1) * limit;

                if (!channelName) return next(createError(400, "channelName is required"));

                const posts = await Post.find({
                    channelName: { $regex: new RegExp(`^${channelName}$`, "i") },
                    serverName: process.env.SERVER_NAME,
                    isChannelPost: true
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

                return res.status(200).json({ success: true, posts });
            }

            case "GET_USER_POSTS": {
                const { authorFederatedId } = req.query;
                const limit = parseInt(req.query.limit) || 10;
                const page = parseInt(req.query.page) || 1;
                const skip = (page - 1) * limit;

                if (!authorFederatedId) return next(createError(400, "authorFederatedId is required"));

                const posts = await Post.find({
                    authorFederatedId
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

                const totalCount = await Post.countDocuments({ authorFederatedId });

                return res.status(200).json({
                    success: true,
                    posts,
                    hasMore: skip + posts.length < totalCount
                });
            }

            default:
                return next(createError(400, `Unsupported feed type: ${type}`));
        }
    } catch (err) {
        next(err);
    }
};
