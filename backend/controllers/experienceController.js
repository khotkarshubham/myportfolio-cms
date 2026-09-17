import Experience from "../models/Experience.js";
import {
  removeUploadFile,
  getUploadPath
} from "../middleware/uploadSecurity.js";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { logAdminAction } from "../utils/auditLogger.js";

const normalizeTechnologies = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item, 50))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

const removeCompanyLogo = async (logoUrl) => {
  if (!logoUrl || !logoUrl.startsWith("/uploads/")) {
    return;
  }

  const relativePath = logoUrl.replace(/^\/uploads\//, "");

  if (!relativePath || relativePath.includes("..")) {
    return;
  }

  try {
    await removeUploadFile(getUploadPath(relativePath));
  } catch (error) {
    console.error(
      "Failed to remove company logo:",
      error?.message || error
    );
  }
};

export const getExperiences = async (req, res) => {
  try {
    const data = await Experience.find()
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, data);
  } catch (error) {
    console.error("Get experiences error:", error);

    return sendError(res, "Unable to load experiences", 500);
  }
};

export const createExperience = async (req, res) => {
  try {
    const company = sanitizeText(req.body?.company || "", 150);
    const role = sanitizeText(req.body?.role || "", 150);
    const startDate = sanitizeText(req.body?.startDate || "", 50);
    const endDate = sanitizeText(req.body?.endDate || "", 50);
    const description = sanitizeText(
      req.body?.description || "",
      1000
    );

    const technologies = normalizeTechnologies(
      req.body?.technologies
    );

    if (!company || !role) {
      return sendError(
        res,
        "Company and role are required",
        400
      );
    }

    const exp = await Experience.create({
      company,
      role,
      startDate,
      endDate,
      description,
      technologies,
      companyLogo: req.file
        ? `/uploads/experience/${req.file.filename}`
        : ""
    });

    await logAdminAction(req, {
      action: "CREATE_EXPERIENCE",
      entity: "EXPERIENCE",
      entityId: exp._id.toString()
    });

    return sendSuccess(res, exp, 201);
  } catch (error) {
    console.error("Create experience error:", error);

    // Remove a newly uploaded file if database creation fails.
    if (req.file) {
      try {
        await removeUploadFile(
          getUploadPath(`experience/${req.file.filename}`)
        );
      } catch (cleanupError) {
        console.error(
          "Failed to clean up uploaded company logo:",
          cleanupError?.message || cleanupError
        );
      }
    }

    return sendError(res, "Unable to create experience", 500);
  }
};

export const updateExperience = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, "Invalid experience ID", 400);
    }

    const existing = await Experience.findById(id);

    if (!existing) {
      return sendError(res, "Experience not found", 404);
    }

    const company =
      req.body?.company !== undefined
        ? sanitizeText(req.body.company, 150)
        : existing.company;

    const role =
      req.body?.role !== undefined
        ? sanitizeText(req.body.role, 150)
        : existing.role;

    const startDate =
      req.body?.startDate !== undefined
        ? sanitizeText(req.body.startDate, 50)
        : existing.startDate;

    const endDate =
      req.body?.endDate !== undefined
        ? sanitizeText(req.body.endDate, 50)
        : existing.endDate;

    const description =
      req.body?.description !== undefined
        ? sanitizeText(req.body.description, 1000)
        : existing.description;

    const technologies =
      req.body?.technologies !== undefined
        ? normalizeTechnologies(req.body.technologies)
        : existing.technologies || [];

    if (!company || !role) {
      return sendError(
        res,
        "Company and role are required",
        400
      );
    }

    const updates = {
      company,
      role,
      startDate,
      endDate,
      description,
      technologies
    };

    if (req.file) {
      updates.companyLogo =
        `/uploads/experience/${req.file.filename}`;
    }

    const experience = await Experience.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!experience) {
      if (req.file) {
        await removeCompanyLogo(
          `/uploads/experience/${req.file.filename}`
        );
      }

      return sendError(res, "Experience not found", 404);
    }

    // Delete the old logo only after the database update succeeds.
    if (req.file && existing.companyLogo) {
      await removeCompanyLogo(existing.companyLogo);
    }

    await logAdminAction(req, {
      action: "UPDATE_EXPERIENCE",
      entity: "EXPERIENCE",
      entityId: experience._id.toString()
    });

    return sendSuccess(res, experience);
  } catch (error) {
    console.error("Update experience error:", error);

    if (req.file) {
      await removeCompanyLogo(
        `/uploads/experience/${req.file.filename}`
      );
    }

    return sendError(res, "Unable to update experience", 500);
  }
};

export const deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, "Invalid experience ID", 400);
    }

    const deleted = await Experience.findByIdAndDelete(id);

    if (!deleted) {
      return sendError(res, "Experience not found", 404);
    }

    if (deleted.companyLogo) {
      await removeCompanyLogo(deleted.companyLogo);
    }

    await logAdminAction(req, {
      action: "DELETE_EXPERIENCE",
      entity: "EXPERIENCE",
      entityId: deleted._id.toString()
    });

    return sendSuccess(res, {
      message: "Experience deleted"
    });
  } catch (error) {
    console.error("Delete experience error:", error);

    return sendError(res, "Unable to delete experience", 500);
  }
};
