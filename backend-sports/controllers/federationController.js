import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import TrustedServer from "../models/TrustedServer.js";
import { createError } from "../utils/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getPublicKey = (req, res, next) => {
  try {
    const publicKeyPath = path.join(__dirname, "../keys/public.pem");

    if (!fs.existsSync(publicKeyPath)) {
      return res.status(500).json({
        message: "Public key not found"
      });
    }

    const publicKey = fs.readFileSync(publicKeyPath, "utf8");

    res.status(200).json({
      serverName: process.env.SERVER_NAME,
      serverUrl: process.env.SERVER_URL,
      algorithm: "RSA-SHA256",
      publicKey
    });

  } catch (error) {
    next(createError(500, "Failed to retrieve public key"));
  }
};



/* ===== TRUSTED SERVER MANAGEMENT (ADMIN) ===== */

export const addTrustedServer = async (req, res, next) => {
  try {
    const { serverUrl } = req.body;

    if (!serverUrl) {
      return next(createError(400, "serverUrl is required"));
    }

    // 1. Fetch the public key from the remote server
    let remoteData;
    try {
      const response = await axios.get(`${serverUrl}/api/federation/public-key`, {
        timeout: 5000
      });
      remoteData = response.data;
    } catch (err) {
      return next(createError(400, "Could not reach remote server or fetch public key"));
    }

    const { serverName, publicKey } = remoteData;

    if (!serverName || !publicKey) {
      return next(createError(400, "Remote server returned invalid public key payload"));
    }

    if (serverName === process.env.SERVER_NAME) {
      return next(createError(400, "Cannot add self as trusted server"));
    }

    // 2. Check if it already exists
    const existingServer = await TrustedServer.findOne({ serverName });
    if (existingServer) {
      // Update URL and key if it already exists
      existingServer.serverUrl = serverUrl;
      existingServer.publicKey = publicKey;
      await existingServer.save();

      return res.status(200).json({
        success: true,
        message: "Trusted server updated",
        trustedServer: existingServer
      });
    }

    // 3. Save new trusted server
    const newServer = new TrustedServer({
      serverName,
      serverUrl,
      publicKey,
      isActive: true
    });

    await newServer.save();

    res.status(201).json({
      success: true,
      message: "Trusted server added successfully",
      trustedServer: newServer
    });

  } catch (err) {
    next(err);
  }
};

export const getTrustedServers = async (req, res, next) => {
  try {
    const servers = await TrustedServer.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      trustedServers: servers
    });
  } catch (err) {
    next(err);
  }
};

export const toggleTrustedServer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const server = await TrustedServer.findById(id);
    if (!server) {
      return next(createError(404, "Trusted server not found"));
    }

    server.isActive = !server.isActive;
    await server.save();

    res.status(200).json({
      success: true,
      message: `Server ${server.serverName} is now ${server.isActive ? 'active' : 'paused'}`,
      trustedServer: server
    });
  } catch (err) {
    next(err);
  }
};

export const removeTrustedServer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const server = await TrustedServer.findByIdAndDelete(id);
    if (!server) {
      return next(createError(404, "Trusted server not found"));
    }

    res.status(200).json({
      success: true,
      message: "Trusted server removed successfully"
    });
  } catch (err) {
    next(err);
  }
};
let globalFederationStatus = true;

export const getFederationStatus = (req, res) => {
  res.status(200).json({ success: true, isEnabled: globalFederationStatus });
};

export const toggleFederationStatus = (req, res) => {
  globalFederationStatus = !globalFederationStatus;
  res.status(200).json({ success: true, isEnabled: globalFederationStatus, message: `Federation is now ${globalFederationStatus ? 'ON' : 'OFF'}` });
};
