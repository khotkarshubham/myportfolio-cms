import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

const VALID_ROLES = ["superadmin", "editor", "viewer"];

const isSuperadmin = (req) => {
  return req.user?.role === "superadmin";
};

const isSelf = (req, adminId) => {
  return req.user?.id === adminId.toString();
};

export const getAdmins = async (req, res) => {
  try {
    if (!isSuperadmin(req)) {
      return sendError(res, "Access denied", 403);
    }

    const admins = await Admin.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, admins);
  } catch (err) {
    return sendError(res, "Unable to load admins", 500);
  }
};

export const createAdmin = async (req, res) => {
  try {
    if (!isSuperadmin(req)) {
      return sendError(res, "Access denied", 403);
    }

    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    const role = VALID_ROLES.includes(req.body.role)
      ? req.body.role
      : "viewer";

    if (!email || password.length < 12) {
      return sendError(
        res,
        "Valid email and a 12+ character password are required",
        400
      );
    }

    // Basic server-side email validation.
    // This intentionally avoids accepting obviously malformed addresses.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return sendError(res, "A valid email address is required", 400);
    }

    const exists = await Admin.findOne({ email });

    if (exists) {
      return sendError(res, "Admin already exists", 400);
    }

    const hashed = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      email,
      password: hashed,
      role,
      isActive: true,
      invitedBy: req.user.id,
    });

    await logAdminAction(req, {
      action: "ADMIN_CREATE",
      entity: email,
      email,
    });

    return sendSuccess(
      res,
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
      },
      201
    );
  } catch (err) {
    return sendError(res, "Unable to create admin", 500);
  }
};

export const updateAdmin = async (req, res) => {
  try {
    if (!isSuperadmin(req)) {
      return sendError(res, "Access denied", 403);
    }

    const targetAdmin = await Admin.findById(req.params.id);

    if (!targetAdmin) {
      return sendError(res, "Admin not found", 404);
    }

    const updates = {};

    if (VALID_ROLES.includes(req.body.role)) {
      updates.role = req.body.role;
    }

    if (typeof req.body.isActive === "boolean") {
      updates.isActive = req.body.isActive;
    }

    const modifyingSelf = isSelf(req, targetAdmin._id);

    /*
     * Never allow a superadmin to:
     * - remove their own superadmin role
     * - deactivate their own account
     */
    if (modifyingSelf) {
      if (
        updates.role !== undefined &&
        updates.role !== "superadmin"
      ) {
        return sendError(
          res,
          "You cannot remove your own superadmin role",
          400
        );
      }

      if (updates.isActive === false) {
        return sendError(
          res,
          "You cannot deactivate your own account",
          400
        );
      }
    }

    /*
     * Prevent removing the last active superadmin.
     *
     * This protects the CMS from becoming permanently inaccessible
     * if there is only one active superadmin account.
     */
    const isCurrentlyActiveSuperadmin =
      targetAdmin.role === "superadmin" &&
      targetAdmin.isActive === true;

    const removingSuperadminRole =
      updates.role !== undefined &&
      updates.role !== "superadmin";

    const deactivatingSuperadmin =
      updates.isActive === false;

    if (
      isCurrentlyActiveSuperadmin &&
      !modifyingSelf &&
      (removingSuperadminRole || deactivatingSuperadmin)
    ) {
      const activeSuperadminCount = await Admin.countDocuments({
        role: "superadmin",
        isActive: true,
      });

      if (activeSuperadminCount <= 1) {
        return sendError(
          res,
          "Cannot remove or deactivate the only active superadmin",
          400
        );
      }
    }

    /*
     * If the target is a superadmin, only another superadmin
     * can modify them.
     *
     * The current middleware already supplies the current role
     * from the database.
     */
    if (
      targetAdmin.role === "superadmin" &&
      !isSuperadmin(req)
    ) {
      return sendError(res, "Cannot modify superadmin", 403);
    }

    const updated = await Admin.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updated) {
      return sendError(res, "Admin not found", 404);
    }

    await logAdminAction(req, {
      action: "ADMIN_UPDATE",
      entity: updated.email,
      email: updated.email,
    });

    return sendSuccess(res, updated);
  } catch (err) {
    return sendError(res, "Unable to update admin", 500);
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    if (!isSuperadmin(req)) {
      return sendError(res, "Access denied", 403);
    }

    const targetAdmin = await Admin.findById(req.params.id);

    if (!targetAdmin) {
      return sendError(res, "Admin not found", 404);
    }

    if (isSelf(req, targetAdmin._id)) {
      return sendError(res, "Cannot delete yourself", 400);
    }

    /*
     * Keep the existing protection:
     * superadmin accounts cannot be deleted through this endpoint.
     */
    if (targetAdmin.role === "superadmin") {
      return sendError(res, "Cannot delete superadmin", 403);
    }

    await Admin.findByIdAndDelete(req.params.id);

    await logAdminAction(req, {
      action: "ADMIN_DELETE",
      entity: targetAdmin.email,
      email: targetAdmin.email,
    });

    return sendSuccess(res, {
      message: "Admin removed",
    });
  } catch (err) {
    return sendError(res, "Unable to delete admin", 500);
  }
};