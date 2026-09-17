import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { profileUpload, projectUpload, blogUpload, certificationUpload, experienceUpload } from "../middleware/uploadSecurity.js";

import { createProject, updateProject, deleteProject } from "../controllers/projectController.js";
import { createBlog, updateBlog, deleteBlog } from "../controllers/blogController.js";
import { createSkill, deleteSkill } from "../controllers/skillController.js";
import { getContacts, deleteContact } from "../controllers/contactController.js";
import { updateProfile } from "../controllers/profileController.js";
import { createCertification, updateCertification, deleteCertification } from "../controllers/certificationController.js";
import { createExperience, updateExperience, deleteExperience } from "../controllers/experienceController.js";

const router = express.Router();
const canEditContent = allowRoles("superadmin", "editor");
const canReadAdmin = allowRoles("superadmin", "editor", "viewer");

router.post("/projects", authMiddleware, canEditContent, projectUpload, createProject);
router.put("/projects/:id", authMiddleware, canEditContent, projectUpload, updateProject);
router.delete("/projects/:id", authMiddleware, canEditContent, deleteProject);

router.post("/blogs", authMiddleware, canEditContent, blogUpload, createBlog);
router.put("/blogs/:id", authMiddleware, canEditContent, blogUpload, updateBlog);
router.delete("/blogs/:id", authMiddleware, canEditContent, deleteBlog);

router.post("/skills", authMiddleware, canEditContent, createSkill);
router.delete("/skills/:id", authMiddleware, canEditContent, deleteSkill);

router.get("/contacts", authMiddleware, canReadAdmin, getContacts);
router.delete("/contacts/:id", authMiddleware, canEditContent, deleteContact);

router.post("/certifications", authMiddleware, canEditContent, certificationUpload, createCertification);
router.put("/certifications/:id", authMiddleware, canEditContent, certificationUpload, updateCertification);
router.delete("/certifications/:id", authMiddleware, canEditContent, deleteCertification);

router.post("/experiences", authMiddleware, canEditContent, experienceUpload, createExperience);
router.put("/experiences/:id", authMiddleware, canEditContent, experienceUpload, updateExperience);
router.delete("/experiences/:id", authMiddleware, canEditContent, deleteExperience);

router.put("/profile", authMiddleware, canEditContent, profileUpload, updateProfile);

export default router;
