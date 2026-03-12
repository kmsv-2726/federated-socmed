import express from "express";
import { createServer, getAllServers, updateServer, deleteServer } from "../controllers/serverController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Get all servers - Public/Auth
router.get("/", getAllServers);

// Admin only actions
router.post("/", verifyToken, verifyAdmin, createServer);
router.put("/:id", verifyToken, verifyAdmin, updateServer);
router.delete("/:id", verifyToken, verifyAdmin, deleteServer);

export default router;
