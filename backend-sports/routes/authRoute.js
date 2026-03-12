import express from "express";
import { loginUser, registerUser, unlockAccount } from "../controllers/AuthController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();


router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/unlock", unlockAccount);
router.get("/unlock", unlockAccount);

export default router;
