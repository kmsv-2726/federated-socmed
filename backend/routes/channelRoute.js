import express from "express"
import { verifyToken } from "../middleware/verifyToken.js";
import { checkFollowStatus, createChannel, deleteChannel, followChannel, getAllChannels, getChannel, getChannelFollowers, unFollowChannel, updateChannelDescription, updateChannelImage, updateChannelRules } from "../controllers/channelController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Actions on channels by Admin only

router.post("/",verifyToken,verifyAdmin,createChannel);
router.delete("/:id",verifyToken,verifyAdmin,deleteChannel);
router.put("/description/:channelName",verifyToken,verifyAdmin,updateChannelDescription);
router.put("/rules/:channelName",verifyToken,verifyAdmin,updateChannelRules);
router.put("/image/:channelName",verifyToken,verifyAdmin,updateChannelImage);

router.get("/followers/:channelName",verifyToken,verifyAdmin,getChannelFollowers);

//User actions on channels

router.post("/follow/:channelName",verifyToken,followChannel);
router.delete("/unfollow/:channelName",verifyToken,unFollowChannel);
router.get("/follow/:channelName",verifyToken,checkFollowStatus);
router.get("/",verifyToken,getAllChannels);
router.get("/:channelName",verifyToken,getChannel);

export default router;