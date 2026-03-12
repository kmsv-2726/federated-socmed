import express from 'express';
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import { createReport, getAllReports, updateReportStatus, resolvePostReport, resolveUserReport } from '../controllers/reportController.js';

const router = express.Router();

router.post("/", verifyToken, createReport);
//optional router.get("/:federatedId", verifyToken, getMyReports);
router.get("/", verifyToken,verifyAdmin, getAllReports);
router.put("/:reportId/status", verifyToken, verifyAdmin, updateReportStatus);
router.put("/:reportId/resolve-post", verifyToken, verifyAdmin, resolvePostReport);
router.put("/:reportId/resolve-user", verifyToken, verifyAdmin, resolveUserReport);


export default router;