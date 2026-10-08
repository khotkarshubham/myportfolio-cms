// A custom header cannot be sent by cross-site forms. Browsers preflight
// cross-origin requests; CORS only permits the configured frontend origins.
export const csrfProtection = (allowedOrigins) => (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("X-CSRF-Protection") !== "1" ||
      (req.get("Origin") && !allowedOrigins.includes(req.get("Origin")))) {
    return res.status(403).json({ success: false, message: "CSRF protection check failed" });
  }
  next();
};
