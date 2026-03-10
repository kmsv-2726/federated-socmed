import express from "express";
import { loginUser, registerUser, logoutUser, unlockAccount } from "../controllers/AuthController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();


router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/logout", verifyToken, logoutUser);
router.post("/unlock", unlockAccount);
router.get("/unlock", unlockAccount);


export default router;
