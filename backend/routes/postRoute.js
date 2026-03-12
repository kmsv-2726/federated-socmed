import express from "express";
import { createComment, createPost, deletePost, getAllPostsAdmin, getPostChannels, getPostsUsers, getTimeline, likePost, repostPost } from "../controllers/postController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/channels", verifyToken, getPostChannels)  // GET /api/posts/channels?channelFederatedId=sports@server1.com
router.get("/users",    verifyToken, getPostsUsers)     // GET /api/posts/users[?authorFederatedId=user@server.com]
router.get("/timeline", verifyToken, getTimeline); // Personalised feed for the logged-in user
router.get("/", verifyToken, getAllPostsAdmin); // For admin stats
router.post("/", verifyToken, createPost);
router.delete('/:id', verifyToken, deletePost);
router.put('/like/', verifyToken, likePost);
router.put('/comment/', verifyToken, createComment);
router.post('/repost', verifyToken, repostPost);

export default router