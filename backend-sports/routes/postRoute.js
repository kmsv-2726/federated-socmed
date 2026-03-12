import express from "express";
import { createComment, createPost, deletePost, getPosts, getTimeline, likePost, repostPost } from "../controllers/postController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getPosts)
router.get("/timeline", verifyToken, getTimeline); // Personalised feed for the logged-in user
router.post("/", verifyToken, createPost);
router.delete('/:id', verifyToken, deletePost);
router.put('/like/', verifyToken, likePost);
router.put('/comment/', verifyToken, createComment);
router.post('/repost', verifyToken, repostPost);

export default router