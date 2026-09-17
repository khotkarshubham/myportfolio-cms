import express from "express";

import {
  trackVisit,
  trackResume,
  getAnalytics
} from "../controllers/analyticsController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { analyticsLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

const canViewAnalytics = allowRoles(
  "superadmin",
  "editor",
  "viewer"
);

/* ================= PUBLIC ANALYTICS ================= */

router.post(
  "/analytics/visit",
  analyticsLimiter,
  trackVisit
);

router.post(
  "/analytics/resume",
  analyticsLimiter,
  trackResume
);

/* ================= ADMIN ANALYTICS ================= */

router.get(
  "/admin/analytics",
  authMiddleware,
  canViewAnalytics,
  getAnalytics
);

export default router;
