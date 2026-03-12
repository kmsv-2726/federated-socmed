import Server from "../models/Server.js";
import { createError } from "../utils/error.js";

export const createServer = async (req, res, next) => {
    console.log("📝 Create Server Request:", req.body);
    try {
        const { name, description, url, category } = req.body;
        if (!name || !description || !url) {
            return next(createError(400, "Missing required fields: name, description, and url are required"));
        }

        const newServer = new Server({
            name,
            description,
            url,
            category: category || "general"
        });

        const savedServer = await newServer.save();
        res.status(200).json({
            success: true,
            server: savedServer
        });
    } catch (err) {
        next(err);
    }
};

export const getAllServers = async (req, res, next) => {
    try {
        const servers = await Server.find();
        res.status(200).json({
            success: true,
            servers
        });
    } catch (err) {
        next(err);
    }
};

export const updateServer = async (req, res, next) => {
    try {
        const serverId = req.params.id;
        const updatedServer = await Server.findByIdAndUpdate(
            serverId,
            { $set: req.body },
            { new: true }
        );
        if (!updatedServer) {
            return next(createError(404, "Server not found"));
        }
        res.status(200).json({
            success: true,
            server: updatedServer
        });
    } catch (err) {
        next(err);
    }
};

export const deleteServer = async (req, res, next) => {
    try {
        const serverId = req.params.id;
        await Server.findByIdAndDelete(serverId);
        res.status(200).json({
            success: true,
            message: "Server deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};
