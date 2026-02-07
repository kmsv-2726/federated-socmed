import Report from "../models/Report.js";
import { createError } from "../utils/error.js";

export const createReport = async (req, res, next) => {
    try {
        const reporterId = req.user.federatedId;
        const { reportedId, targetType, reason, description } = req.body;

        // Basic validation
        if (!reportedId || !targetType || !reason) {
            return next(createError(400, "Missing required fields"));
        }

        const newReport = new Report({
            reporterId: reporterId,
            reportedId: reportedId,
            targetType : targetType,
            reason : reason,
            description : description
        });
        const savedReport = await newReport.save();
        res.status(201).json(savedReport);
    }catch(err){
        next(err);
    }
}

export const getAllReports = async (req, res, next) => {
    try {
        const { status, targetType, limit } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (targetType) filter.targetType = targetType;

        const reports = await Report.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 20); // default = 20

        res.status(200).json({
            success: true,
            count: reports.length,
            reports
        });
    }catch(err){
        next(err);
    }
}



export const updateReportStatus = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body;
        if (!["pending", "resolved", "dismissed"].includes(status)) {
            return next(createError(400, "Invalid status value"));
        }
        const updatedReport = await Report.findByIdAndUpdate(
            reportId,
            { status: status },
            { new: true }
        );
        if (!updatedReport) {
            return next(createError(404, "Report not found"));
        }
        res.status(200).json(updatedReport);
    }catch(err){
        next(err);
    }
}

