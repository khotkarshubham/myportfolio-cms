import Certification from "../models/Certification.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  removeUploadFile,
  getUploadPath
} from "../middleware/uploadSecurity.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sanitizeText } from "../utils/sanitizeHtml.js";

/**
 * Validate certification URL.
 *
 * Only HTTP and HTTPS URLs are accepted.
 */
const isValidUrl = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
};

/**
 * Safely resolve an uploaded certification file path.
 */
const getCertificationUploadPath = (filePath) =>
  getUploadPath(filePath) || null;

/**
 * Get all certifications
 *
 * Public endpoint.
 */
export const getCertifications = async (req, res) => {
  try {
    const certifications = await Certification.find()
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, certifications);
  } catch (error) {
    console.error("Get certifications error:", error);

    return sendError(
      res,
      "Failed to load certifications",
      500
    );
  }
};

/**
 * Create certification
 */
export const createCertification = async (req, res) => {
  let uploadedImagePath = null;

  try {
    const name = sanitizeText(req.body?.name, 200);
    const url = String(req.body?.url || "").trim();
    const issuer = sanitizeText(req.body?.issuer || "", 200);
    const year = sanitizeText(req.body?.year || "", 20);

    if (!name) {
      return sendError(
        res,
        "Certification name is required",
        400
      );
    }

    if (!isValidUrl(url)) {
      return sendError(
        res,
        "Credential URL must be a valid HTTP or HTTPS URL",
        400
      );
    }

    if (req.file?.path) {
      uploadedImagePath = getCertificationUploadPath(
        req.file.path
      );

      if (!uploadedImagePath) {
        await removeUploadFile(req.file.path);

        return sendError(
          res,
          "Invalid certification image path",
          400
        );
      }
    }

    const certification = await Certification.create({
      name,
      url,
      issuer,
      year,
      file: uploadedImagePath || ""
    });

    await logAdminAction(req, {
      action: "CREATE_CERTIFICATION",
      entity: "Certification",
      entityId: certification._id,
      adminId: req.user?.id,
      email: req.user?.email,
      details: {
        name: certification.name
      }
    });

    return sendSuccess(
      res,
      certification,
      201,
      "Certification created successfully"
    );
  } catch (error) {
    if (uploadedImagePath) {
      await removeUploadFile(uploadedImagePath);
    }

    console.error("Create certification error:", error);

    return sendError(
      res,
      "Failed to create certification",
      500
    );
  }
};

/**
 * Update certification
 */
export const updateCertification = async (req, res) => {
  let newImagePath = null;

  try {
    const { id } = req.params;

    const certification = await Certification.findById(id);

    if (!certification) {
      if (req.file?.path) {
        await removeUploadFile(req.file.path);
      }

      return sendError(
        res,
        "Certification not found",
        404
      );
    }

    if (req.body?.name !== undefined) {
      const name = sanitizeText(req.body.name, 200);
      if (!name) {
        return sendError(
          res,
          "Certification name cannot be empty",
          400
        );
      }
      certification.name = name;
    }

    if (req.body?.url !== undefined) {
      const url = String(req.body.url).trim();
      if (!isValidUrl(url)) {
        return sendError(
          res,
          "Credential URL must be a valid HTTP or HTTPS URL",
          400
        );
      }
      certification.url = url;
    }

    if (req.body?.issuer !== undefined) {
      certification.issuer = sanitizeText(req.body.issuer || "", 200);
    }

    if (req.body?.year !== undefined) {
      certification.year = sanitizeText(req.body.year || "", 20);
    }

    /*
     * Capture old image before replacing it.
     */
    const oldFilePath = getCertificationUploadPath(
      certification.file
    );

    /*
     * Validate new upload before changing the database.
     */
    if (req.file?.path) {
      newImagePath = getCertificationUploadPath(
        req.file.path
      );

      if (!newImagePath) {
        await removeUploadFile(req.file.path);

        return sendError(
          res,
          "Invalid certification image path",
          400
        );
      }

      certification.file = newImagePath;
    }

    /*
     * Save database changes first.
     */
    await certification.save();

    /*
     * Delete old image only after successful database save.
     */
    if (
      newImagePath &&
      oldFilePath &&
      oldFilePath !== newImagePath
    ) {
      await removeUploadFile(oldFilePath);
    }

    /*
     * New image is now owned by the database.
     */
    newImagePath = null;

    await logAdminAction(req, {
      action: "UPDATE_CERTIFICATION",
      entity: "Certification",
      entityId: certification._id,
      adminId: req.user?.id,
      email: req.user?.email,
      details: {
        name: certification.name
      }
    });

    return sendSuccess(
      res,
      certification,
      200,
      "Certification updated successfully"
    );
  } catch (error) {
    /*
     * Remove a newly uploaded file if the database update failed.
     */
    if (newImagePath) {
      await removeUploadFile(newImagePath);
    }

    console.error("Update certification error:", error);

    return sendError(
      res,
      "Failed to update certification",
      500
    );
  }
};

/**
 * Delete certification
 */
export const deleteCertification = async (req, res) => {
  try {
    const { id } = req.params;

    const certification = await Certification.findById(id);

    if (!certification) {
      return sendError(
        res,
        "Certification not found",
        404
      );
    }

    const filePath = getCertificationUploadPath(
      certification.file
    );

    await Certification.findByIdAndDelete(id);

    if (filePath) {
      await removeUploadFile(filePath);
    }

    await logAdminAction(req, {
      action: "DELETE_CERTIFICATION",
      entity: "Certification",
      entityId: id,
      adminId: req.user?.id,
      email: req.user?.email,
      details: {
        name: certification.name
      }
    });

    return sendSuccess(
      res,
      null,
      200,
      "Certification deleted successfully"
    );
  } catch (error) {
    console.error("Delete certification error:", error);

    return sendError(
      res,
      "Failed to delete certification",
      500
    );
  }
};
