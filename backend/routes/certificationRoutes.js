import express from "express";
import { getCertifications } from "../controllers/certificationController.js";

const router = express.Router();

/*
 * ============================================================
 * PUBLIC
 * ============================================================
 */

/**
 * GET /api/public/certifications
 *
 * Public portfolio certifications.
 */
router.get(
  "/public/certifications",
  getCertifications
);

export default router;
