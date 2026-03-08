import express from "express";
import { getServerConfig, updateServerConfig } from "../controllers/serverConfigController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", getServerConfig);
router.put("/", verifyToken, updateServerConfig);

export default router;
