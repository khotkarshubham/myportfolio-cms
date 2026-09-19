import Profile from "../models/Profile.js";
import {
  removeUploadFile,
  getUploadPath,
  shouldKeepFile
} from "../middleware/uploadSecurity.js";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { logAdminAction } from "../utils/auditLogger.js";

const buildUploadPath = (filename, folder) =>
  `/uploads/${folder}/${filename}`;

const validateHttpUrl = (value) => {
  if (!value) return "";

  try {
    const url = new URL(String(value).trim());
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
};

const normalizeWhatsapp = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return validateHttpUrl(trimmed);
  }
  return trimmed.replace(/[^\d+]/g, "").slice(0, 20);
};

const isManagedUpload = (filePath) =>
  typeof filePath === "string" &&
  filePath.startsWith("/uploads/");

const removeProfileFile = async (filePath) => {
  if (!isManagedUpload(filePath)) {
    return;
  }

  const relativePath = filePath.replace(/^\/uploads\//, "");

  if (!relativePath || relativePath.includes("..")) {
    return;
  }

  try {
    await removeUploadFile(getUploadPath(relativePath));
  } catch (error) {
    console.error(
      "Failed to remove profile upload:",
      error?.message || error
    );
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne().lean();

    if (!profile) {
      return sendError(res, "Profile has not been configured", 404);
    }

    return sendSuccess(res, profile);
  } catch (error) {
    console.error("Get profile error:", error);

    return sendError(res, "Unable to load profile", 500);
  }
};

export const updateProfile = async (req, res) => {
  const uploadedFiles = [];

  try {
    const name =
      req.body?.name !== undefined
        ? sanitizeText(req.body.name, 150)
        : undefined;

    const title =
      req.body?.title !== undefined
        ? sanitizeText(req.body.title, 300)
        : undefined;

    const github =
      req.body?.github !== undefined
        ? validateHttpUrl(req.body.github)
        : undefined;
    const linkedin =
      req.body?.linkedin !== undefined
        ? validateHttpUrl(req.body.linkedin)
        : undefined;
    const instagram =
      req.body?.instagram !== undefined
        ? validateHttpUrl(req.body.instagram)
        : undefined;
    const whatsapp =
      req.body?.whatsapp !== undefined
        ? normalizeWhatsapp(req.body.whatsapp)
        : undefined;
    const email =
      req.body?.email !== undefined
        ? sanitizeText(req.body.email, 200)
        : undefined;

    let profile = await Profile.findOne();

    if (!profile) {
      profile = new Profile();
    }

    const oldImage = profile.image;
    const oldResume = profile.resume;

    let image;
    let resume;

    if (req.files?.image?.[0]) {
      const uploaded = req.files.image[0];

      uploadedFiles.push({
        path: getUploadPath(`profile/${uploaded.filename}`)
      });

      image = buildUploadPath(
        uploaded.filename,
        "profile"
      );
    }

    if (req.files?.resume?.[0]) {
      const uploaded = req.files.resume[0];

      uploadedFiles.push({
        path: getUploadPath(`resume/${uploaded.filename}`)
      });

      resume = buildUploadPath(
        uploaded.filename,
        "resume"
      );
    }

    if (name !== undefined) {
      if (!name) {
        return sendError(res, "Name cannot be empty", 400);
      }

      profile.name = name;
    }

    if (title !== undefined) {
      if (!title) {
        return sendError(res, "Title cannot be empty", 400);
      }

      profile.title = title;
    }

    if (github !== undefined) profile.github = github;
    if (linkedin !== undefined) profile.linkedin = linkedin;
    if (instagram !== undefined) profile.instagram = instagram;
    if (whatsapp !== undefined) profile.whatsapp = whatsapp;
    if (email !== undefined) profile.email = email;

    if (req.body?.github && github === "") {
      return sendError(res, "GitHub must be a valid http(s) URL", 400);
    }
    if (req.body?.linkedin && linkedin === "") {
      return sendError(res, "LinkedIn must be a valid http(s) URL", 400);
    }
    if (req.body?.instagram && instagram === "") {
      return sendError(res, "Instagram must be a valid http(s) URL", 400);
    }

    if (image) {
      profile.image = image;
    }

    if (resume) {
      profile.resume = resume;
    }

    await profile.save();

    // Delete replaced files only after the database update succeeds.
    if (
      image &&
      oldImage &&
      !shouldKeepFile(oldImage)
    ) {
      await removeProfileFile(oldImage);
    }

    if (resume && oldResume) {
      await removeProfileFile(oldResume);
    }

    await logAdminAction(req, {
      action: "UPDATE_PROFILE",
      entity: "PROFILE",
      entityId: profile._id.toString()
    });

    return sendSuccess(res, profile);
  } catch (error) {
    console.error("Update profile error:", error);

    // Clean up newly uploaded files if the database update fails.
    for (const uploaded of uploadedFiles) {
      try {
        await removeUploadFile(uploaded.path);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up uploaded profile file:",
          cleanupError?.message || cleanupError
        );
      }
    }

    return sendError(res, "Unable to update profile", 500);
  }
};
