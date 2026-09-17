import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import ActivityLog from "../models/ActivityLog.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

const router = express.Router();

/**
 * GET /logs
 *
 * Activity logs contain administrative information and are therefore
 * restricted to superadmins.
 */
router.get(
  "/logs",
  authMiddleware,
  allowRoles("superadmin"),
  async (req, res) => {
    try {
      const logs = await ActivityLog.find()
        .populate("adminId", "email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return sendSuccess(res, logs);
    } catch (error) {
      console.error("Get activity logs error:", error);

      return sendError(
        res,
        "Unable to load activity logs",
        500
      );
    }
  }
);

export default router;
