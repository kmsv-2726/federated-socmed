import { createError } from "../utils/error.js";
import {
    parseSearchQuery,
    searchLocalUsers,
    searchRemoteUsers,
    enrichWithFollowStatus
} from "../services/searchService.js";


export const searchUsers = async (req, res, next) => {
    try {
        const rawQuery = req.query.q;
        const requestedLimit = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 100)   // cap at 100 to prevent abuse
            : 20;                             // default limit (User Story 7)

        // ── Story 4: Validate query format ──────────────────────
        const { username, serverName, isValid, error } = parseSearchQuery(rawQuery);

        if (!isValid) {
            return next(createError(400, error));
        }

        let users = [];
        let searchType = "local"; // for logging / response metadata

        if (serverName) {
            // ── Story 3 & 8: Remote search ───────────────────────
            const isLocalServer = serverName === process.env.SERVER_NAME;

            if (isLocalServer) {
                // Query targets the local server explicitly — treat as local search
                searchType = "local";
                console.log(`[SEARCH] Local search (explicit local server): q=${rawQuery}`);
                users = await searchLocalUsers(username, limit);
            } else {
                // ── Story 8: Check remote search toggle ─────────────
                const remoteEnabled = process.env.ENABLE_REMOTE_SEARCH !== "false";

                if (!remoteEnabled) {
                    return res.status(403).json({
                        success: false,
                        message: "Remote search is disabled on this server.",
                        searchType: "remote_disabled"
                    });
                }

                searchType = "remote";
                console.log(`[SEARCH] Remote search: username=${username}, server=${serverName}`);
                users = await searchRemoteUsers(username, serverName, limit);
            }
        } else {
            // ── Stories 1 & 2: Local‑only search ──────────────────
            searchType = "local";
            console.log(`[SEARCH] Local-only search (no server specified): q=${rawQuery}`);
            users = await searchLocalUsers(username, limit);
        }

        // ── Story 6: Enrich with follow status ──────────────────
        const currentFederatedId = req.user?.federatedId || null;
        const enrichedUsers = await enrichWithFollowStatus(users, currentFederatedId);

        // ── Story 7: Result count is already capped by limit ────
        return res.status(200).json({
            success: true,
            searchType,
            query: rawQuery,
            count: enrichedUsers.length,
            limit,
            users: enrichedUsers
        });
    } catch (err) {
        next(err);
    }
};

