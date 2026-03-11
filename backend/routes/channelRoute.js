import express from "express"
import { verifyToken } from "../middleware/verifyToken.js";
import { checkFollowStatus, createChannel, deleteChannel, followChannel, getAllChannels, getChannel, getChannelFollowers, unFollowChannel, updateChannelDescription, updateChannelImage, updateChannelRules, getPendingRequests, handleChannelRequest, requestChannelAccess } from "../controllers/channelController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Actions on channels by Admin only

router.post("/", verifyToken, verifyAdmin, createChannel);
router.delete("/:id", verifyToken, verifyAdmin, deleteChannel);
router.put("/description/:channelName", verifyToken, verifyAdmin, updateChannelDescription);
router.put("/rules/:channelName", verifyToken, verifyAdmin, updateChannelRules);
router.put("/image/:channelName", verifyToken, verifyAdmin, updateChannelImage);

router.get("/followers/:channelName", verifyToken, verifyAdmin, getChannelFollowers);
router.get("/admin/requests", verifyToken, verifyAdmin, getPendingRequests);
router.post("/admin/requests/:requestId/handle", verifyToken, verifyAdmin, handleChannelRequest);

//User actions on channels

router.post("/follow/:channelName", verifyToken, followChannel);
router.post("/request/:channelName", verifyToken, requestChannelAccess);
router.delete("/unfollow/:channelName", verifyToken, unFollowChannel);
router.get("/follow/:channelName", verifyToken, checkFollowStatus);
router.get("/", verifyToken, getAllChannels);
router.get("/:channelName", verifyToken, getChannel);

export default router;