import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { getRecentActivities } from "../controllers/activityController.js";

const router = express.Router();

router.get("/", verifyToken, getRecentActivities);

export default router;
