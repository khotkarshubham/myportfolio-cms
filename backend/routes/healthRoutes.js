import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { getHealth, getReadiness, getHealthDetails } from "../controllers/healthController.js";

const router = express.Router();

router.get("/health", getHealth);
router.get("/health/ready", getReadiness);
router.get("/health/details", authMiddleware, allowRoles("superadmin"), getHealthDetails);

export default router;
