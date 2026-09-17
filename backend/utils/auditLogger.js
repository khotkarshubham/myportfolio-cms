import ActivityLog from "../models/ActivityLog.js";

/**
 * Get the client's IP address.
 *
 * Express should be configured with the correct `trust proxy`
 * setting in the main server/app configuration.
 *
 * Do not manually trust arbitrary X-Forwarded-For values here.
 */
const getClientIp = (req) => {
  const ip = req?.ip || req?.socket?.remoteAddress || "";

  return ip === "::1" ? "127.0.0.1" : String(ip).trim();
};

/**
 * Safely convert an ID to a string.
 */
const normalizeId = (value) => {
  if (!value) return undefined;

  try {
    return value.toString();
  } catch {
    return undefined;
  }
};

/**
 * Create an audit log entry.
 *
 * `req.user` is optional.
 *
 * This is important because some actions happen BEFORE
 * authentication middleware has populated req.user — most
 * notably login attempts.
 *
 * Example:
 *
 * await logAdminAction(req, {
 *   action: "LOGIN_SUCCESS",
 *   entity: "Admin",
 *   entityId: admin._id,
 *   adminId: admin._id,
 *   email: admin.email
 * });
 */
export const logAdminAction = async (
  req,
  {
    action,
    entity,
    entityId,
    adminId,
    email
  } = {}
) => {
  if (!action) {
    console.warn("Audit log skipped: action is missing");
    return;
  }

  try {
    const resolvedAdminId = normalizeId(
      adminId || req?.user?.id
    );

    const resolvedEmail = String(
      email || req?.user?.email || ""
    )
      .trim()
      .toLowerCase();

    const resolvedEntityId = normalizeId(entityId);

    await ActivityLog.create({
      /*
       * adminId is optional in the ActivityLog schema, so
       * login failures and pre-authentication events can
       * still be recorded.
       */
      ...(resolvedAdminId
        ? { adminId: resolvedAdminId }
        : {}),

      email: resolvedEmail,

      action: String(action).trim(),

      entity: entity
        ? String(entity).trim()
        : undefined,

      entityId: resolvedEntityId,

      ip: getClientIp(req),

      userAgent: String(
        req?.headers?.["user-agent"] || ""
      ).slice(0, 1000)
    });
  } catch (error) {
    /*
     * Audit logging must never break the actual application
     * request. Log the failure server-side and continue.
     */
    console.warn(
      "Audit log failed:",
      error?.message || error
    );
  }
};

export default logAdminAction;
