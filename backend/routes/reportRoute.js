import express from 'express';
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import { createReport, getAllReports, updateReportStatus } from '../controllers/reportController.js';

const router = express.Router();

router.post("/", verifyToken, createReport);
//optional router.get("/:federatedId", verifyToken, getMyReports);
router.get("/", verifyToken,verifyAdmin, getAllReports);
router.put("/:reportId/status", verifyToken, verifyAdmin, updateReportStatus);


export default router;