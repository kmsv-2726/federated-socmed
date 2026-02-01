import express from "express";

const router = express.Router();

router.post('/',createPost);
router.delete('/:id',deletePost);
router.put('/:id/like',likePost);

export default router