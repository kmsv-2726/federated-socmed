import express from "express"
import { loginUser, registerUser, unlockAccount } from "../controllers/AuthController.js";

const router = express.Router()


router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/unlock", unlockAccount);


export default router