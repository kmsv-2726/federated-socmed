import { createError } from "../utils/error.js";
import { getPostsByIdsService } from "../services/postService.js";
import { getUserProfileService, searchUsersService } from "../services/userService.js";
import { getChannelProfileService } from "../services/channelService.js";

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

            default:
                return next(createError(400, `Unsupported feed type: ${type}`));
        }
    } catch (err) {
        next(err);
    }
};
