import ServerConfig from "../models/ServerConfig.js";
import { createError } from "../utils/error.js";

// GET /api/server-config
export const getServerConfig = async (req, res, next) => {
    try {
        let config = await ServerConfig.findOne({ serverName: process.env.SERVER_NAME });

        // If somehow not initialized, return a default dynamically
        if (!config) {
            config = new ServerConfig({ serverName: process.env.SERVER_NAME });
            await config.save();
        }

        res.status(200).json({
            success: true,
            config: {
                serverName: config.serverName,
                description: config.description,
                rules: config.rules,
                updatedAt: config.updatedAt
            }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/server-config
export const updateServerConfig = async (req, res, next) => {
    try {
        if (req.user.role !== "admin") {
            return next(createError(403, "Only administrators can update the server configuration"));
        }

        const { description, rules } = req.body;

        if (!description || !rules) {
            return next(createError(400, "Description and Rules are required"));
        }

        let config = await ServerConfig.findOne({ serverName: process.env.SERVER_NAME });

        if (!config) {
            config = new ServerConfig({ serverName: process.env.SERVER_NAME, description, rules });
        } else {
            config.description = description;
            config.rules = rules;
        }

        await config.save();

        res.status(200).json({
            success: true,
            message: "Server configuration updated successfully",
            config: {
                serverName: config.serverName,
                description: config.description,
                rules: config.rules,
                updatedAt: config.updatedAt
            }
        });

    } catch (err) {
        next(err);
    }
};
