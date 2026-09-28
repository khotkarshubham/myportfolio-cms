import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { loginAdmin, changePassword } from "../controllers/authController.js";
import { loginLimiter, passwordLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Admin Login
router.post("/login", loginLimiter, loginAdmin);

// Admin Password Change
router.post("/change-password", authMiddleware, passwordLimiter, changePassword);

export default router;
