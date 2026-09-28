import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Always verify the admin against the database.
    // This ensures deleted/deactivated admins cannot keep using
    // previously issued JWT tokens.
    const admin = await Admin.findById(decoded.id)
      .select("_id email role isActive sessionVersion")
      .lean();

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found",
      });
    }

    if (admin.isActive !== true) {
      return res.status(401).json({
        success: false,
        message: "Admin account is inactive",
      });
    }

    if ((decoded.sessionVersion || 0) !== (admin.sessionVersion || 0)) {
      return res.status(401).json({ success: false, message: "Your session has ended. Please sign in again." });
    }

    // Use the CURRENT database values rather than trusting
    // role/email values stored inside the JWT.
    req.user = {
      id: admin._id.toString(),
      role: admin.role,
      email: admin.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
