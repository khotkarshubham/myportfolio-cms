import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin
} from "../controllers/adminManagementController.js";

const router = express.Router();

/* ONLY SUPERADMIN */

router.get("/admins", authMiddleware, allowRoles("superadmin"), getAdmins);

router.post("/admins", authMiddleware, allowRoles("superadmin"), createAdmin);

router.put("/admins/:id", authMiddleware, allowRoles("superadmin"), updateAdmin);

router.delete("/admins/:id", authMiddleware, allowRoles("superadmin"), deleteAdmin);

export default router;