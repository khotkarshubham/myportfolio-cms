import rateLimit from "express-rate-limit";

const rateLimitHandler = (req, res) => {
  return res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later."
  });
};

/**
 * Admin login
 *
 * Strict limit to reduce brute-force attempts.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skipSuccessfulRequests: false
});

export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: req => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Contact form
 *
 * Prevents spam submissions while allowing normal portfolio traffic.
 */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

/**
 * Public analytics
 *
 * Analytics requests can be frequent because they may be generated
 * automatically by page visits.
 */
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});
