import Analytics from "../models/Analytics.js";
import geoip from "geoip-lite";
import crypto from "crypto";

/*
 * IMPORTANT:
 * Express must be configured with the correct `trust proxy`
 * setting in server.js when the application is behind a
 * reverse proxy such as Nginx.
 *
 * Do NOT manually trust X-Forwarded-For here.
 * req.ip is the value Express resolves according to the
 * server's trusted-proxy configuration.
 */
const getClientIp = (req) => {
  const ip = String(req.ip || req.socket?.remoteAddress || "").trim();

  if (!ip) {
    return "unknown";
  }

  return ip === "::1" ? "127.0.0.1" : ip;
};

/*
 * Never store the raw IP address.
 *
 * A dedicated IP_HASH_SALT is preferred. JWT_SECRET is retained
 * as a fallback so existing deployments do not immediately break.
 */
const hashIp = (ip) =>
  crypto
    .createHash("sha256")
    .update(`${process.env.IP_HASH_SALT || process.env.JWT_SECRET}:${ip}`)
    .digest("hex");

/*
 * Only public pages should be tracked.
 *
 * This protects the analytics endpoint even if someone bypasses
 * the frontend and sends requests directly to the API.
 */
const normalizePublicPage = (value) => {
  if (typeof value !== "string") {
    return "/";
  }

  const page = value.trim();

  if (!page || !page.startsWith("/")) {
    return "/";
  }

  /*
   * Prevent protocol-relative URLs and malformed paths.
   */
  if (
    page.startsWith("//") ||
    page.includes("\\") ||
    page.includes("\0")
  ) {
    return "/";
  }

  /*
   * Never count CMS/admin routes as public traffic.
   */
  if (
    page === "/admin" ||
    page.startsWith("/admin/")
  ) {
    return null;
  }

  return page.slice(0, 200);
};

const getGeoCountry = (ip) => {
  if (!ip || ip === "unknown") {
    return "Unknown";
  }

  try {
    return geoip.lookup(ip)?.country || "Unknown";
  } catch {
    return "Unknown";
  }
};

/* ---------------- TRACK VISIT ---------------- */

export const trackVisit = async (req, res) => {
  try {
    const page = normalizePublicPage(req.body?.page);

    /*
     * Ignore analytics requests generated for admin pages.
     * Return success so clients cannot use this endpoint to
     * distinguish valid/invalid analytics paths.
     */
    if (page === null) {
      return res.json({ success: true });
    }

    const ip = getClientIp(req);

    await Analytics.create({
      page,
      ip: hashIp(ip),
      country: getGeoCountry(ip),
      type: "visit"
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Analytics visit tracking failed:", err);

    return res.status(500).json({
      message: "Unable to track visit"
    });
  }
};

/* ---------------- TRACK RESUME CLICK ---------------- */

export const trackResume = async (req, res) => {
  try {
    const ip = getClientIp(req);

    await Analytics.create({
      page: "resume",
      ip: hashIp(ip),
      country: getGeoCountry(ip),
      type: "resume"
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Analytics resume tracking failed:", err);

    return res.status(500).json({
      message: "Unable to track resume click"
    });
  }
};

/* ---------------- MAIN ANALYTICS ---------------- */

export const getAnalytics = async (req, res) => {
  try {
    /*
     * Run independent database operations concurrently.
     * This reduces the total time required to load the dashboard.
     */
    const [
      totalVisits,
      uniqueVisitors,
      resumeClicks,
      chart,
      countries,
      topPages
    ] = await Promise.all([
      /* Total public visits */
      Analytics.countDocuments({
        type: "visit"
      }),

      /*
       * Unique visitors should be calculated from visits only.
       * Resume clicks should not create additional visitors.
       */
      Analytics.distinct("ip", {
        type: "visit"
      }),

      /* Resume downloads/clicks */
      Analytics.countDocuments({
        type: "resume"
      }),

      /* Last 7 days */
      Analytics.aggregate([
        {
          $match: {
            type: "visit",
            createdAt: {
              $gte: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000
              )
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%d-%m",
                date: "$createdAt"
              }
            },
            visits: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            _id: 1
          }
        }
      ]),

      /* Top countries */
      Analytics.aggregate([
        {
          $match: {
            type: "visit"
          }
        },
        {
          $group: {
            _id: "$country",
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            count: -1
          }
        },
        {
          $limit: 5
        }
      ]),

      /* Top public pages */
      Analytics.aggregate([
        {
          $match: {
            type: "visit"
          }
        },
        {
          $group: {
            _id: "$page",
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            count: -1
          }
        },
        {
          $limit: 5
        }
      ])
    ]);

    return res.json({
      totalVisits,
      uniqueVisitors: uniqueVisitors.length,
      resumeClicks,
      chart,
      countries,
      topPages
    });
  } catch (err) {
    console.error("Analytics dashboard failed:", err);

    return res.status(500).json({
      message: "Unable to load analytics"
    });
  }
};
