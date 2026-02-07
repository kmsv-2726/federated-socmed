import express from 'express';
import { verifyToken } from "../middleware/verifyToken.js";
import {getUserProfile , followUser, unfollowUser, checkFollowStatus, getMyFollowers, getMyFollowing } from '../controllers/userController.js';

const router = express.Router();


router.get("/:federatedId", getUserProfile);

router.post("/:federatedId/follow", verifyToken, followUser);
router.delete("/:federatedId/follow", verifyToken, unfollowUser);
router.get("/:federatedId/follow/status", verifyToken, checkFollowStatus);

router.get("/followers", verifyToken, getMyFollowers);
router.get("/following", verifyToken, getMyFollowing);



export default router;