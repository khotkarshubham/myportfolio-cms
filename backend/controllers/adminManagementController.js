import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validPassword, PASSWORD_RULE } from "../utils/passwordPolicy.js";

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

    const paginated = req.query?.page !== undefined;
    const page = Math.max(
      1,
      Math.min(100000, parseInt(req.query?.page, 10) || 1),
    );
    const filter = {};
    const search = String(req.query?.search || "")
      .trim()
      .slice(0, 200);
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "email"].map((key) => ({
        [key]: { $regex: escaped, $options: "i" },
      }));
    }
    if (req.query?.role) {
      if (!VALID_ROLES.includes(req.query.role))
        return sendError(res, "Invalid role filter", 400);
      filter.role = req.query.role;
    }
    if (req.query?.status) {
      if (!["active", "disabled"].includes(req.query.status))
        return sendError(res, "Invalid status filter", 400);
      filter.isActive = req.query.status === "active";
    }
    let query = Admin.find(filter)
      .select(
        "name email role isActive createdAt updatedAt lastLoginAt passwordChangedAt invitedBy",
      )
      .sort({ createdAt: -1, _id: -1 });
    if (paginated) query = query.skip((page - 1) * 10).limit(10);
    const admins = await query.lean();
    if (paginated) {
      const [total, members, active, superadmins] = await Promise.all([
        Admin.countDocuments(filter),
        Admin.countDocuments(),
        Admin.countDocuments({ isActive: true }),
        Admin.countDocuments({ isActive: true, role: "superadmin" }),
      ]);
      return sendSuccess(res, {
        admins,
        total,
        page,
        pageSize: 10,
        summary: { members, active, superadmins },
      });
    }

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

    const role = req.body.role ?? "viewer";
    if (!VALID_ROLES.includes(role))
      return sendError(res, "Choose a valid role", 400);

    if (!email || !validPassword(req.body.password)) {
      return sendError(res, `A valid email is required. ${PASSWORD_RULE}`, 400);
    }

    // Basic server-side email validation.
    // This intentionally avoids accepting obviously malformed addresses.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email) || email.length > 254) {
      return sendError(res, "A valid email address is required", 400);
    }

    const exists = await Admin.findOne({ email });

    if (exists) {
      return sendError(res, "An account with this email already exists", 409);
    }

    const hashed = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      email,
      password: hashed,
      name: sanitizeText(req.body.name, 100) || "Admin",
      role,
      isActive: true,
      invitedBy: req.user.id,
    });

    await logAdminAction(req, {
      action: "ADMIN_CREATE",
      entity: "ADMIN",
      entityId: admin._id,
    });

    return sendSuccess(
      res,
      {
        _id: admin._id,
        id: admin._id,
        name: admin.name,
        createdAt: admin.createdAt,
        lastLoginAt: admin.lastLoginAt,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
      },
      201,
    );
  } catch (err) {
    if (err.code === 11000)
      return sendError(res, "An account with this email already exists", 409);
    return sendError(res, "Unable to create admin", 500);
  }
};

export const updateAdmin = async (req, res) => {
  try {
    if (!isSuperadmin(req)) {
      return sendError(res, "Access denied", 403);
    }

    if (!/^[a-f\d]{24}$/i.test(req.params.id))
      return sendError(res, "Invalid account ID", 400);
    if (req.body.role !== undefined && !VALID_ROLES.includes(req.body.role))
      return sendError(res, "Choose a valid role", 400);
    if (
      req.body.isActive !== undefined &&
      typeof req.body.isActive !== "boolean"
    )
      return sendError(res, "Account status must be true or false", 400);
    if (
      req.body.name !== undefined &&
      (typeof req.body.name !== "string" ||
        !req.body.name.trim() ||
        req.body.name.length > 100)
    )
      return sendError(res, "Name must contain 1–100 characters", 400);
    if (
      req.body.role === undefined &&
      req.body.isActive === undefined &&
      req.body.name === undefined
    )
      return sendError(res, "Provide a name, role or account status", 400);
    const targetAdmin = await Admin.findById(req.params.id);

    if (!targetAdmin) {
      return sendError(res, "Admin not found", 404);
    }

    const updates = {};
    if (req.body.name !== undefined)
      updates.name = sanitizeText(req.body.name, 100);

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
      if (updates.role !== undefined && updates.role !== "superadmin") {
        return sendError(
          res,
          "You cannot remove your own superadmin role",
          400,
        );
      }

      if (updates.isActive === false) {
        return sendError(res, "You cannot deactivate your own account", 400);
      }
    }

    /*
     * Prevent removing the last active superadmin.
     *
     * This protects the CMS from becoming permanently inaccessible
     * if there is only one active superadmin account.
     */
    const isCurrentlyActiveSuperadmin =
      targetAdmin.role === "superadmin" && targetAdmin.isActive === true;

    const removingSuperadminRole =
      updates.role !== undefined && updates.role !== "superadmin";

    const deactivatingSuperadmin = updates.isActive === false;

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
          400,
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
    if (targetAdmin.role === "superadmin" && !isSuperadmin(req)) {
      return sendError(res, "Cannot modify superadmin", 403);
    }

    const changed = ["role", "isActive"].some(
      (key) => updates[key] !== undefined && targetAdmin[key] !== updates[key],
    );
    const updated = await Admin.findOneAndUpdate(
      {
        _id: targetAdmin._id,
        role: targetAdmin.role,
        isActive: targetAdmin.isActive,
      },
      { $set: updates, ...(changed ? { $inc: { sessionVersion: 1 } } : {}) },
      {
        new: true,
        runValidators: true,
      },
    ).select(
      "name email role isActive createdAt updatedAt lastLoginAt passwordChangedAt",
    );

    if (!updated) {
      return sendError(res, "Account changed. Refresh and retry.", 409);
    }

    await logAdminAction(req, {
      action: "ADMIN_UPDATE",
      entity: "ADMIN",
      entityId: updated._id,
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

    if (!/^[a-f\d]{24}$/i.test(req.params.id))
      return sendError(res, "Invalid account ID", 400);
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

    const deleted = await Admin.findOneAndDelete({
      _id: targetAdmin._id,
      role: { $ne: "superadmin" },
    });
    if (!deleted)
      return sendError(res, "Account changed. Refresh and retry.", 409);

    await logAdminAction(req, {
      action: "ADMIN_DELETE",
      entity: "ADMIN",
      entityId: targetAdmin._id,
    });

    return sendSuccess(res, {
      message: "Admin removed",
    });
  } catch (err) {
    return sendError(res, "Unable to delete admin", 500);
  }
};
