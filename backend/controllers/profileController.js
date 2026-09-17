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
