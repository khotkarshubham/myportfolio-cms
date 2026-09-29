import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { loginAdmin, changePassword, getAccount, revokeOtherSessions } from "../controllers/authController.js";
import { loginLimiter, passwordLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Admin Login
router.post("/login", loginLimiter, loginAdmin);

// Admin Password Change
router.post("/change-password", authMiddleware, passwordLimiter, changePassword);
router.get("/me", authMiddleware, getAccount);
router.post("/revoke-sessions", authMiddleware, passwordLimiter, revokeOtherSessions);

export default router;
