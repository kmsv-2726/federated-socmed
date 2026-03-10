import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { searchUsers } from "../controllers/searchController.js";

const router = express.Router();


router.get("/users", verifyToken, searchUsers);

export default router;

