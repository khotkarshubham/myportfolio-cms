import Project from "../models/Project.js";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  removeUploadFile,
  getUploadPath
} from "../middleware/uploadSecurity.js";
import { logAdminAction } from "../utils/auditLogger.js";

/**
 * Validate and normalize a project URL.
 * Only HTTP and HTTPS URLs are allowed.
 */
const validateUrl = (value) => {
  if (!value) return "";

  try {
    const url = new URL(String(value).trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
};

/**
 * Normalize technology values.
 */
const normalizeTech = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => sanitizeText(item, 50))
    .filter(Boolean)
    .slice(0, 20);
};

/**
 * Return a safe filesystem path only for managed project uploads.
 */
const getProjectUploadPath = (imagePath) => {
  if (
    typeof imagePath !== "string" ||
    !imagePath.startsWith("/uploads/projects/")
  ) {
    return null;
  }

  const relativePath = imagePath.replace(
    /^\/uploads\/projects\//,
    ""
  );

  if (!relativePath || relativePath.includes("..")) {
    return null;
  }

  return getUploadPath(`projects/${relativePath}`);
};

/**
 * Remove an uploaded file without allowing cleanup failures
 * to break an otherwise successful request.
 */
const safelyRemoveUpload = async (filePath) => {
  if (!filePath) return;

  try {
    await removeUploadFile(filePath);
  } catch (error) {
    console.error(
      "Failed to remove project upload:",
      error?.message || error
    );
  }
};

const normalizeManagedImage = (value) => {
  const image = String(value || "").trim();
  return image && getProjectUploadPath(image) ? image : "";
};

export const createProject = async (req, res) => {
  const uploadedFile = req.file
    ? getProjectUploadPath(`/uploads/projects/${req.file.filename}`)
    : null;

  try {
    const title = sanitizeText(req.body?.title || "", 150);
    const description = sanitizeText(
      req.body?.description || "",
      1000
    );

    const github = validateUrl(req.body?.github || "");
    const demo = validateUrl(req.body?.demo || "");

    if (!title || !description) {
      if (uploadedFile) {
        await safelyRemoveUpload(uploadedFile);
      }

      return sendError(
        res,
        "Title and description are required",
        400
      );
    }

    if (req.body?.github && !github) {
      if (uploadedFile) {
        await safelyRemoveUpload(uploadedFile);
      }

      return sendError(
        res,
        "GitHub URL must be a valid HTTP/HTTPS URL",
        400
      );
    }

    if (req.body?.demo && !demo) {
      if (uploadedFile) {
        await safelyRemoveUpload(uploadedFile);
      }

      return sendError(
        res,
        "Demo URL must be a valid HTTP/HTTPS URL",
        400
      );
    }

    const image = req.file
      ? `/uploads/projects/${req.file.filename}`
      : normalizeManagedImage(req.body?.image);

    if (req.body?.image && !image) {
      return sendError(res, "Image must be a managed project upload", 400);
    }

    const tech = normalizeTech(req.body?.tech);

    const project = await Project.create({
      title,
      description,
      image,
      github,
      demo,
      tech
    });

    await logAdminAction(req, {
      action: "CREATE_PROJECT",
      entity: "PROJECT",
      entityId: project._id.toString()
    });

    return sendSuccess(res, project, 201);
  } catch (error) {
    console.error("Create project error:", error);

    if (uploadedFile) {
      await safelyRemoveUpload(uploadedFile);
    }

    return sendError(
      res,
      "Unable to create project",
      500
    );
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, projects);
  } catch (error) {
    console.error("Get projects error:", error);

    return sendError(
      res,
      "Unable to load projects",
      500
    );
  }
};

export const updateProject = async (req, res) => {
  let newImagePath = null;

  try {
    const existing = await Project.findById(req.params.id);

    if (!existing) {
      return sendError(res, "Project not found", 404);
    }

    const title =
      req.body?.title !== undefined
        ? sanitizeText(req.body.title, 150)
        : existing.title;

    const description =
      req.body?.description !== undefined
        ? sanitizeText(req.body.description, 1000)
        : existing.description;

    const github =
      req.body?.github !== undefined
        ? validateUrl(req.body.github)
        : existing.github || "";

    const demo =
      req.body?.demo !== undefined
        ? validateUrl(req.body.demo)
        : existing.demo || "";

    const tech =
      req.body?.tech !== undefined
        ? normalizeTech(req.body.tech)
        : existing.tech || [];

    if (!title || !description) {
      return sendError(
        res,
        "Title and description are required",
        400
      );
    }

    if (
      req.body?.github !== undefined &&
      req.body.github &&
      !github
    ) {
      return sendError(
        res,
        "GitHub URL must be a valid HTTP/HTTPS URL",
        400
      );
    }

    if (
      req.body?.demo !== undefined &&
      req.body.demo &&
      !demo
    ) {
      return sendError(
        res,
        "Demo URL must be a valid HTTP/HTTPS URL",
        400
      );
    }

    const updates = {
      title,
      description,
      github,
      demo,
      tech
    };

    const oldImagePath = getProjectUploadPath(existing.image);

    if (req.file) {
      newImagePath = getProjectUploadPath(
        `/uploads/projects/${req.file.filename}`
      );

      updates.image = `/uploads/projects/${req.file.filename}`;
    } else if (req.body?.image !== undefined) {
      const image = normalizeManagedImage(req.body.image);
      if (req.body.image && !image) {
        return sendError(res, "Image must be a managed project upload", 400);
      }
      updates.image = image;
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!project) {
      if (newImagePath) {
        await safelyRemoveUpload(newImagePath);
      }

      return sendError(res, "Project not found", 404);
    }

    // Delete the old image only after the database update succeeds.
    if (
      req.file &&
      oldImagePath &&
      oldImagePath !== newImagePath
    ) {
      await safelyRemoveUpload(oldImagePath);
    }

    await logAdminAction(req, {
      action: "UPDATE_PROJECT",
      entity: "PROJECT",
      entityId: project._id.toString()
    });

    return sendSuccess(res, project);
  } catch (error) {
    console.error("Update project error:", error);

    // If the database update failed, remove the newly uploaded file.
    if (newImagePath) {
      await safelyRemoveUpload(newImagePath);
    }

    return sendError(
      res,
      "Unable to update project",
      500
    );
  }
};

export const deleteProject = async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(
      req.params.id
    );

    if (!deleted) {
      return sendError(res, "Project not found", 404);
    }

    const imagePath = getProjectUploadPath(deleted.image);

    // Database deletion succeeded, so file cleanup can happen afterward.
    if (imagePath) {
      await safelyRemoveUpload(imagePath);
    }

    await logAdminAction(req, {
      action: "DELETE_PROJECT",
      entity: "PROJECT",
      entityId: deleted._id.toString()
    });

    return sendSuccess(res, {
      message: "Project deleted"
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return sendError(
      res,
      "Unable to delete project",
      500
    );
  }
};
