import express from "express";
import { createContact } from "../controllers/contactController.js";
import { contactLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Public contact form
router.post("/", contactLimiter, createContact);

export default router;
