import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validPassword } from "../utils/passwordPolicy.js";

const INVALID_LOGIN_MESSAGE = "Invalid email or password";

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

// bcrypt only considers the first 72 bytes of a password.
// Rejecting longer UTF-8 passwords avoids ambiguous authentication behavior.
const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.FmQfX6FJ4G1mKxjQ2rj5gN8N7q7Y9uW";

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getPasswordByteLength = (password) => {
  return Buffer.byteLength(password, "utf8");
};

/**
 * Create a short-lived access token.
 *
 * The auth middleware re-checks the Admin record on every
 * authenticated request, so disabling/deleting/demoting an
 * account takes effect immediately rather than waiting for
 * the JWT to expire.
 */
const createAccessToken = (admin) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: admin._id.toString(),
      role: admin.role,
      email: admin.email,
      sessionVersion: admin.sessionVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );
};

/**
 * Admin login
 */
export const loginAdmin = async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  const password = String(req.body?.password || "");

  try {
    if (!email || !password) {
      await logAdminAction(req, {
        action: "LOGIN_FAILED",
        entity: "ADMIN",
        email,
      });

      return sendError(res, "Email and password are required", 400);
    }

    if (!isValidEmail(email)) {
      await logAdminAction(req, {
        action: "LOGIN_FAILED",
        entity: "ADMIN",
        email,
      });

      return sendError(res, INVALID_LOGIN_MESSAGE, 401);
    }

    if (
      typeof req.body?.password !== "string" ||
      getPasswordByteLength(password) > PASSWORD_MAX_BYTES
    ) {
      await logAdminAction(req, {
        action: "LOGIN_FAILED",
        entity: "ADMIN",
        email,
      });

      return sendError(res, INVALID_LOGIN_MESSAGE, 401);
    }

    const admin = await Admin.findOne({ email });

    /*
     * Always perform a bcrypt comparison.
     *
     * This reduces the timing difference between:
     * - an unknown email
     * - an existing email with a wrong password
     */
    const passwordHash = admin?.password || DUMMY_PASSWORD_HASH;

    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!admin || !isMatch) {
      await logAdminAction(req, {
        action: "LOGIN_FAILED",
        entity: "ADMIN",
        ...(admin?._id ? { entityId: admin._id } : {}),
        ...(admin?.email ? { email: admin.email } : { email }),
      });

      return sendError(res, INVALID_LOGIN_MESSAGE, 401);
    }

    /*
     * Account status is checked after password verification
     * so inactive accounts do not reveal their state through
     * a different authentication response.
     */
    if (admin.isActive !== true) {
      await logAdminAction(req, {
        action: "LOGIN_BLOCKED",
        entity: "ADMIN",
        entityId: admin._id,
        adminId: admin._id,
        email: admin.email,
      });

      return sendError(res, INVALID_LOGIN_MESSAGE, 401);
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    await Admin.updateOne(
      { _id: admin._id },
      { $set: { lastLoginAt: new Date() } },
    );
    const token = createAccessToken(admin);

    await logAdminAction(req, {
      action: "LOGIN_SUCCESS",
      entity: "ADMIN",
      entityId: admin._id,
      adminId: admin._id,
      email: admin.email,
    });

    return sendSuccess(res, {
      token,
      expiresIn: 3600,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return sendError(res, "Login failed", 500);
  }
};

/**
 * Change admin password
 */
export const changePassword = async (req, res) => {
  try {
    if (!req.user?.id) {
      return sendError(res, "Authentication required", 401);
    }

    const oldPassword = String(req.body?.oldPassword || "");

    const newPassword = String(req.body?.newPassword || "");

    if (!oldPassword || !newPassword) {
      return sendError(res, "Old and new passwords are required", 400);
    }

    if (
      !validPassword(req.body?.newPassword) ||
      typeof req.body?.oldPassword !== "string" ||
      getPasswordByteLength(oldPassword) > 72
    ) {
      return sendError(
        res,
        `New password must be at least ${PASSWORD_MIN_LENGTH} characters and no more than ${PASSWORD_MAX_BYTES} UTF-8 bytes`,
        400,
      );
    }

    if (oldPassword === newPassword) {
      return sendError(
        res,
        "New password must be different from the current password",
        400,
      );
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return sendError(res, "Admin not found", 404);
    }

    if (admin.isActive !== true) {
      return sendError(res, "Admin account is inactive", 403);
    }

    const isMatch = await bcrypt.compare(oldPassword, admin.password);

    if (!isMatch) {
      await logAdminAction(req, {
        action: "CHANGE_PASSWORD_FAILED",
        entity: "ADMIN",
        entityId: admin._id,
        adminId: admin._id,
        email: admin.email,
      });

      return sendError(res, "Current password is incorrect", 400);
    }

    const password = await bcrypt.hash(newPassword, 12);

    const updated = await Admin.findOneAndUpdate(
      {
        _id: admin._id,
        password: admin.password,
        isActive: true,
        $or: [
          { sessionVersion: req.user.sessionVersion || 0 },
          ...(req.user.sessionVersion
            ? []
            : [{ sessionVersion: { $exists: false } }]),
        ],
      },
      {
        $set: { password, passwordChangedAt: new Date() },
        $inc: { sessionVersion: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!updated)
      return sendError(
        res,
        "Your account changed during this request. Sign in again and retry.",
        409,
      );

    await logAdminAction(req, {
      action: "CHANGE_PASSWORD",
      entity: "ADMIN",
      entityId: admin._id,
      adminId: admin._id,
      email: admin.email,
    });

    return sendSuccess(res, {
      message:
        "Password changed successfully. Other sessions have been signed out.",
      token: createAccessToken(updated),
    });
  } catch (error) {
    console.error("Change password error:", error);

    return sendError(res, "Unable to change password", 500);
  }
};

export const getAccount = async (req, res) => {
  try {
    const account = await Admin.findById(req.user.id)
      .select("name email role createdAt lastLoginAt passwordChangedAt")
      .lean();
    if (!account) return sendError(res, "Account not found", 404);
    return sendSuccess(res, account);
  } catch {
    return sendError(res, "Unable to load account details", 500);
  }
};

export const revokeOtherSessions = async (req, res) => {
  try {
    const password = req.body?.currentPassword;
    if (
      typeof password !== "string" ||
      !password ||
      getPasswordByteLength(password) > 72
    )
      return sendError(res, "Enter your current password", 400);
    const admin = await Admin.findById(req.user.id);
    if (!admin || !admin.isActive)
      return sendError(res, "Account is unavailable", 401);
    if (!(await bcrypt.compare(password, admin.password)))
      return sendError(res, "Current password is incorrect", 400);
    const updated = await Admin.findOneAndUpdate(
      {
        _id: admin._id,
        isActive: true,
        password: admin.password,
        $or: [
          { sessionVersion: req.user.sessionVersion || 0 },
          ...(req.user.sessionVersion
            ? []
            : [{ sessionVersion: { $exists: false } }]),
        ],
      },
      { $inc: { sessionVersion: 1 } },
      { new: true },
    );
    if (!updated)
      return sendError(
        res,
        "Your account changed. Sign in again and retry.",
        409,
      );
    await logAdminAction(req, {
      action: "REVOKE_SESSIONS",
      entity: "ADMIN",
      entityId: admin._id,
    });
    return sendSuccess(res, {
      token: createAccessToken(updated),
      message:
        "Other sessions will be signed out on their next request. This session remains active.",
    });
  } catch {
    return sendError(res, "Unable to revoke sessions", 500);
  }
};
