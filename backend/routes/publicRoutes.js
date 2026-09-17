import express from "express";

import {
  getProjects
} from "../controllers/projectController.js";

import {
  getBlogs,
  getBlogBySlug
} from "../controllers/blogController.js";

import {
  getSkills
} from "../controllers/skillController.js";

import {
  getProfile
} from "../controllers/profileController.js";

const router = express.Router();

/* ---------------- PROJECTS ---------------- */

router.get("/projects", getProjects);


/* ---------------- BLOGS ---------------- */

router.get("/blogs", getBlogs);
router.get("/blog/:slug", getBlogBySlug);


/* ---------------- SKILLS ---------------- */

router.get("/skills", getSkills);


/* ---------------- PROFILE ---------------- */

router.get("/profile", getProfile);


export default router;