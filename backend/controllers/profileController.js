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

import { validateHttpUrl, validateWhatsapp } from "../utils/profileLinks.js";
const validateEmail = (value) => { const email = String(value ?? "").trim(); return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; };

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
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

/**
 * Remove newly uploaded files when the update fails.
 */
const cleanupUploadedFiles = async (files) => {
  for (const uploaded of files) {
    try {
      await removeUploadFile(uploaded.path);
    } catch (cleanupError) {
      console.error(
        "Failed to clean up uploaded profile file:",
        cleanupError?.message || cleanupError
      );
    }
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne().lean();

    if (!profile) {
      return sendError(
        res,
        "Profile has not been configured",
        404
      );
    }

    return sendSuccess(res, profile);
  } catch (error) {
    console.error("Get profile error:", error);

    return sendError(
      res,
      "Unable to load profile",
      500
    );
  }
};

export const updateProfile = async (req, res) => {
  const uploadedFiles = [];

  try {
    /*
     * Only update fields that were actually submitted.
     *
     * This is important because an omitted field should NOT
     * overwrite the existing database value.
     */

    const name =
      req.body?.name !== undefined
        ? sanitizeText(req.body.name, 100)
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
        ? validateWhatsapp(req.body.whatsapp)
        : undefined;

    const email =
      req.body?.email !== undefined
        ? validateEmail(req.body.email)
        : undefined;

    let profile = await Profile.findOne();

    /*
     * Create the profile document if it does not exist.
     */
    if (!profile) {
      profile = new Profile();
    }

    const oldImage = profile.image;
    const oldResume = profile.resume;

    let image;
    let resume;

    /*
     * Profile image upload.
     */
    if (req.files?.image?.[0]) {
      const uploaded = req.files.image[0];

      uploadedFiles.push({
        path: getUploadPath(
          `profile/${uploaded.filename}`
        )
      });

      image = buildUploadPath(
        uploaded.filename,
        "profile"
      );
    }

    /*
     * Resume upload.
     */
    if (req.files?.resume?.[0]) {
      const uploaded = req.files.resume[0];

      uploadedFiles.push({
        path: getUploadPath(
          `resume/${uploaded.filename}`
        )
      });

      resume = buildUploadPath(
        uploaded.filename,
        "resume"
      );
    }

    /*
     * -----------------------------
     * FIELD VALIDATION
     * -----------------------------
     */

    if (name !== undefined && !name) {
      throw validationError(
        "Name cannot be empty"
      );
    }

    if (title !== undefined && !title) {
      throw validationError(
        "Title cannot be empty"
      );
    }

    if (email === null) {
      throw validationError(
        "Email must be a valid email address"
      );
    }

    if (
      github !== undefined &&
      github === "" &&
      String(req.body?.github ?? "").trim()
    ) {
      throw validationError(
        "GitHub must be a valid http(s) URL"
      );
    }

    if (
      linkedin !== undefined &&
      linkedin === "" &&
      String(req.body?.linkedin ?? "").trim()
    ) {
      throw validationError(
        "LinkedIn must be a valid http(s) URL"
      );
    }

    if (
      instagram !== undefined &&
      instagram === "" &&
      String(req.body?.instagram ?? "").trim()
    ) {
      throw validationError(
        "Instagram must be a valid http(s) URL"
      );
    }

    if (whatsapp === null) {
      throw validationError(
        "WhatsApp must be a valid phone number or WhatsApp URL"
      );
    }

    /*
     * -----------------------------
     * UPDATE ONLY SUBMITTED FIELDS
     * -----------------------------
     */

    if (name !== undefined) {
      profile.name = name;
    }

    if (title !== undefined) {
      profile.title = title;
    }

    if (github !== undefined) {
      profile.github = github;
    }

    if (linkedin !== undefined) {
      profile.linkedin = linkedin;
    }

    if (instagram !== undefined) {
      profile.instagram = instagram;
    }

    if (whatsapp !== undefined) {
      profile.whatsapp = whatsapp;
    }

    if (email !== undefined) {
      profile.email = email;
    }

    /*
     * -----------------------------
     * UPLOADED FILES
     * -----------------------------
     */

    if (image) {
      profile.image = image;
    }

    if (resume) {
      profile.resume = resume;
    }

    /*
     * -----------------------------
     * DATABASE UPDATE
     * -----------------------------
     */

    await profile.save();

    /*
     * Delete replaced profile image only AFTER
     * successful database save.
     */
    if (
      image &&
      oldImage &&
      !shouldKeepFile(oldImage)
    ) {
      await removeProfileFile(oldImage);
    }

    /*
     * Delete replaced resume only AFTER
     * successful database save.
     */
    if (
      resume &&
      oldResume
    ) {
      await removeProfileFile(oldResume);
    }

    /*
     * Audit log.
     */
    await logAdminAction(req, {
      action: "UPDATE_PROFILE",
      entity: "PROFILE",
      entityId: profile._id.toString()
    });

    return sendSuccess(
      res,
      profile
    );
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    /*
     * If DB save/validation fails after files were
     * uploaded, remove the newly uploaded files.
     */
    await cleanupUploadedFiles(
      uploadedFiles
    );

    return sendError(
      res,
      error?.statusCode === 400 || error?.name === "ValidationError"
        ? error.message
        : "Unable to update profile",
      error?.statusCode === 400 || error?.name === "ValidationError"
        ? 400
        : 500
    );
  }
};
