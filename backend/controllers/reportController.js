import Report from "../models/Report.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { createError } from "../utils/error.js";
import { sendFederationEvent } from "../services/federationService.js";
import { createReportService } from "../services/reportService.js";
import { sendPostRemovedEmail, sendAccountSuspendedEmail } from "../services/emailService.js";

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

export const resolvePostReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);
    if (!report) return next(createError(404, "Report not found"));
    if (report.targetType !== "post") return next(createError(400, "Report is not a post report"));

    // Find the post by federatedId (reportedId stores the post's federatedId)
    const post = await Post.findOne({ federatedId: report.reportedId });

    if (post) {
      // Find post author to email them
      const author = await User.findOne({ federatedId: post.authorFederatedId || post.federatedId?.split("/")[0] });

      // Delete the post
      await Post.findByIdAndDelete(post._id);

      // Send notification email (async, don't block)
      if (author?.email) {
        sendPostRemovedEmail(author.email, post.description || post.content || '', report.reason).catch(() => {});
      }
    }

    // Mark report as resolved
    report.status = "resolved";
    await report.save();

    res.status(200).json({
      success: true,
      message: "Post removed and report resolved",
      report
    });
  } catch (err) {
    next(err);
  }
};

export const resolveUserReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);
    if (!report) return next(createError(404, "Report not found"));
    if (report.targetType !== "user") return next(createError(400, "Report is not a user report"));

    // Find and suspend the user
    const user = await User.findOne({ federatedId: report.reportedId });
    if (!user) return next(createError(404, "Reported user not found"));

    user.isSuspended = true;
    user.tokenVersion += 1; // Invalidate all active sessions
    await user.save();

    // Send notification email
    if (user.email) {
      sendAccountSuspendedEmail(user.email, report.reason).catch(() => {});
    }

    // Mark report as resolved
    report.status = "resolved";
    await report.save();

    res.status(200).json({
      success: true,
      message: "User suspended and report resolved",
      report
    });
  } catch (err) {
    next(err);
  }
};
