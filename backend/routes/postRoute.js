import express from "express";
import { createComment, createPost, deletePost, getPosts, likePost } from "../controllers/postController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/",verifyToken,getPosts)
router.post("/",verifyToken, createPost);
router.delete('/:id',verifyToken,deletePost);
router.put('/like/:id',verifyToken,likePost);
router.put('/comment/:id',verifyToken,createComment);

export default router