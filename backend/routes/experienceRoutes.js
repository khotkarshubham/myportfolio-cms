import express from "express";
import { getExperiences } from "../controllers/experienceController.js";

const router = express.Router();

router.get("/public/experiences", getExperiences);

export default router;
