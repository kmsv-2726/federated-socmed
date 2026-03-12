import express from 'express';
import { verifyToken } from "../middleware/verifyToken.js";
import { getUserProfile, searchUsers, followUser, unfollowUser, checkFollowStatus, getMyFollowers, getMyFollowing, getAllProfiles, resetPassword, updateProfile, deleteAccount } from '../controllers/userController.js';

const router = express.Router();

router.get("/", verifyToken, getAllProfiles);
router.get("/search", verifyToken, searchUsers);
router.get("/followers", verifyToken, getMyFollowers);
router.get("/following", verifyToken, getMyFollowing);

router.put("/profile", verifyToken, updateProfile);
router.put("/password", verifyToken, resetPassword);
router.delete("/account", verifyToken, deleteAccount);

router.post("/:federatedId/follow", verifyToken, followUser);
router.delete("/:federatedId/follow", verifyToken, unfollowUser);
router.get("/:federatedId/follow/status", verifyToken, checkFollowStatus);


router.get("/:federatedId", verifyToken, getUserProfile);


export default router;
