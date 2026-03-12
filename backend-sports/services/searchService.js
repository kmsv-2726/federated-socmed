import User from "../models/User.js";
import UserFollow from "../models/UserFollow.js";
import axios from "axios";
import { createError } from "../utils/error.js";

// ──────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────
const DEFAULT_RESULT_LIMIT = 20;


const FEDERATED_ID_REGEX = /^[\w.-]+(@[\w.-]+)?$/;

export const parseSearchQuery = (rawQuery) => {
    if (!rawQuery || typeof rawQuery !== "string") {
        return { username: null, serverName: null, isValid: false, error: "Search query is required" };
    }

    const trimmed = rawQuery.trim();

    if (!FEDERATED_ID_REGEX.test(trimmed)) {
        return {
            username: null,
            serverName: null,
            isValid: false,
            error: "Invalid search query format. Use 'username' or 'username@server'."
        };
    }

    if (trimmed.includes("@")) {
        const atIndex = trimmed.indexOf("@");
        const username = trimmed.substring(0, atIndex);
        const serverName = trimmed.substring(atIndex + 1);

        if (!username || !serverName) {
            return {
                username: null,
                serverName: null,
                isValid: false,
                error: "Invalid format. Both username and server name are required in 'username@server'."
            };
        }

        return { username, serverName, isValid: true, error: null };
    }

    // Local‑only search
    return { username: trimmed, serverName: null, isValid: true, error: null };
};


export const searchLocalUsers = async (partialUsername, limit = DEFAULT_RESULT_LIMIT) => {
    const users = await User.find(
        {
            displayName: { $regex: partialUsername, $options: "i" },
            isRemote: { $ne: true }   // only local users
        },
        {
            displayName: 1,
            avatarUrl: 1,
            federatedId: 1,
            followersCount: 1,
            followingCount: 1,
            serverName: 1
        }
    ).limit(limit);

    return users;
};

// ──────────────────────────────────────────────

export const searchRemoteUsers = async (username, serverName, limit = DEFAULT_RESULT_LIMIT) => {
    // Check if remote search is enabled
    const remoteSearchEnabled = process.env.ENABLE_REMOTE_SEARCH !== "false";

    if (!remoteSearchEnabled) {
        throw createError(403, "Remote search is disabled on this server.");
    }

    // Resolve the remote server URL via the port map (matches existing federation approach)
    const serverPortMap = {
        food: 5000,
        sports: 5001
    };

    const port = serverPortMap[serverName];

    if (!port) {
        throw createError(400, `Unknown remote server: ${serverName}`);
    }

    try {
        const response = await axios.get(
            `http://localhost:${port}/api/search/users`,
            {
                params: { q: username, limit },
                timeout: 5000
            }
        );

        const remoteUsers = response.data?.users || [];

        // Cache remote users locally (upsert to avoid duplicates)
        for (const remoteUser of remoteUsers) {
            if (remoteUser.federatedId) {
                await User.findOneAndUpdate(
                    { federatedId: remoteUser.federatedId },
                    {
                        $setOnInsert: {
                            displayName: remoteUser.displayName || remoteUser.federatedId.split("@")[0],
                            avatarUrl: remoteUser.avatarUrl || null,
                            federatedId: remoteUser.federatedId,
                            serverName: serverName,
                            originServer: serverName,
                            isRemote: true,
                            followersCount: remoteUser.followersCount || 0,
                            followingCount: remoteUser.followingCount || 0,
                            // Required fields with sensible defaults for cached remote users
                            firstName: remoteUser.displayName || remoteUser.federatedId.split("@")[0],
                            lastName: ".",
                            dob: new Date("2000-01-01"),
                            email: `${remoteUser.federatedId}@cached`,
                            password: "REMOTE_NO_LOGIN"
                        }
                    },
                    { upsert: true, new: true }
                );
            }
        }

        return remoteUsers.slice(0, limit);
    } catch (err) {
        if (err.status === 403) throw err; // re‑throw "remote search disabled"
        throw createError(502, `Failed to reach remote server '${serverName}': ${err.message}`);
    }
};



export const enrichWithFollowStatus = async (users, currentFederatedId) => {
    if (!currentFederatedId || users.length === 0) return users;

    const userFederatedIds = users.map((u) => u.federatedId);

    const follows = await UserFollow.find({
        followerFederatedId: currentFederatedId,
        followingFederatedId: { $in: userFederatedIds }
    });

    const followingSet = new Set(follows.map((f) => f.followingFederatedId));

    return users.map((u) => {
        const userObj = u.toObject ? u.toObject() : { ...u };
        userObj.is_following = followingSet.has(userObj.federatedId);
        return userObj;
    });
};

