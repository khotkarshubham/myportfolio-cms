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
      const paginated = req.query.page !== undefined;
      const page = Math.max(1, Math.min(100000, parseInt(req.query.page, 10) || 1));
      const filter = {};
      const search = String(req.query.search || "").trim().slice(0, 200);
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = ["email", "action", "entity", "entityId", "ip"].map(key => ({ [key]: { $regex: escaped, $options: "i" } }));
      }
      const categories = { create: "CREATE", update: "UPDATE|REORDER", delete: "DELETE", login: "LOGIN|PASSWORD", inbox: "CONTACT" };
      if (Object.hasOwn(categories, req.query.category)) filter.action = { $regex: categories[req.query.category], $options: "i" };
      if (req.query.from || req.query.to) {
        const from = new Date(req.query.from), to = new Date(req.query.to);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) return sendError(res, "Invalid date range", 400);
        filter.createdAt = { $gte: from, $lt: to };
      }
      const logs = await ActivityLog.find(filter)
        .populate("adminId", "email")
        .sort({ createdAt: -1, _id: -1 })
        .skip(paginated ? (page - 1) * 25 : 0)
        .limit(paginated ? 25 : 100)
        .lean();

      return sendSuccess(res, paginated ? { logs, page, total: await ActivityLog.countDocuments(filter), pageSize: 25 } : logs);
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
