import ActivityLog from "../models/ActivityLog.js";

export const getRecentActivities = async (req, res, next) => {
    try {
        const activities = await ActivityLog.find().sort({ createdAt: -1 }).limit(20);
        res.status(200).json({ success: true, activities });
    } catch (err) {
        next(err);
    }
};
