import Report from "../models/Report.js";
import { createError } from "../utils/error.js";
import { sendFederationEvent } from "../services/federationService.js";
import { createReportService } from "../services/reportService.js";

//remote Forwarding required to be implemented

export const createReport = async (req, res, next) => {
  try {
    const reporterId = req.user.federatedId;
    const { reportedId, targetType, reason, description } = req.body;

    const beforeSlash = reportedId.split("/")[0]; // cricket@food OR username@food
    const originServer = beforeSlash.split("@")[1];

    if (!originServer) {
      return next(createError(400, "Invalid reportedId format"));
    }

    const isRemoteTarget = originServer !== process.env.SERVER_NAME;

    if (isRemoteTarget) {
      // 1. Notify the remote server FIRST
      const response = await sendFederationEvent({
        type: "REPORT",
        actorFederatedId: reporterId,
        objectFederatedId: reportedId,
        data: {
          targetType,
          reason,
          description
        }
      });

      if (response && (response.queued || response.skipped)) {
        return next(createError(502, "Remote server is offline or unreachable. Report failed."));
      }

      // 2. Write local record ONLY if federation succeeded
      const savedReport = await createReportService({
        reporterId,
        reportedId,
        targetType,
        reason,
        description,
        targetOriginServer: originServer,
        isRemoteTarget
      });

      return res.status(201).json({
        success: true,
        message: "Report submitted successfully",
        reportId: savedReport._id
      });
    }

    // Local report
    const savedReport = await createReportService({
      reporterId,
      reportedId,
      targetType,
      reason,
      description,
      targetOriginServer: originServer,
      isRemoteTarget
    });


    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      reportId: savedReport._id
    });

  } catch (err) {
    next(err);
  }
};

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
  } catch (err) {
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
  } catch (err) {
    next(err);
  }
}

