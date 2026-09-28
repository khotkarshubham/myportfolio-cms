import { analyticsWindow, fillAnalyticsDays, normalizePublicPage } from "../utils/analyticsWindow.js";
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
  const range = String(req.query?.range || 'all');
  let window;
  try { window = analyticsWindow(range); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  try {
    const { start, end, previousStart, previousEnd, days } = window;
    const publicVisits = { type: 'visit', page: { $not: /^\/admin(?:\/|$)/i } };
    const currentDates = range === 'all' ? {} : { createdAt: { $gte: start, $lte: end } };
    const visits = { ...publicVisits, ...currentDates };
    const uniqueCount = match => Analytics.aggregate([{ $match: match }, { $group: { _id: '$ip' } }, { $count: 'count' }]);
    const ranking = field => Analytics.aggregate([{ $match: visits }, { $group: { _id: { $ifNull: [`$${field}`, 'Unknown'] }, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 10 }]);
    const previous = { ...publicVisits, createdAt: { $gte: previousStart, $lte: previousEnd } };
    const [totalVisits, unique, resumeClicks, rows, countries, topPages, active, comparison] = await Promise.all([
      Analytics.countDocuments(visits),
      uniqueCount(visits),
      Analytics.countDocuments({ type: 'resume', ...currentDates }),
      Analytics.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, $or: [publicVisits, { type: 'resume' }] } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, visits: { $sum: { $cond: [{ $eq: ['$type', 'visit'] }, 1, 0] } }, resumeClicks: { $sum: { $cond: [{ $eq: ['$type', 'resume'] }, 1, 0] } } } },
        { $sort: { _id: 1 } }
      ]),
      ranking('country'), ranking('page'),
      uniqueCount({ ...publicVisits, createdAt: { $gte: new Date(end.getTime() - 5 * 60000), $lte: end } }),
      range === 'all' ? null : Promise.all([
        Analytics.countDocuments(previous), uniqueCount(previous),
        Analytics.countDocuments({ type: 'resume', createdAt: { $gte: previousStart, $lte: previousEnd } })
      ])
    ]);
    return res.json({
      totalVisits, uniqueVisitors: unique[0]?.count || 0, resumeClicks,
      activeVisitors: active[0]?.count || 0,
      chart: fillAnalyticsDays(rows, start, days), countries, topPages,
      previous: comparison ? { totalVisits: comparison[0], uniqueVisitors: comparison[1][0]?.count || 0, resumeClicks: comparison[2] } : null,
      range, timezone: 'UTC', chartDays: days, generatedAt: end.toISOString()
    });
  } catch (error) {
    console.error('Analytics dashboard failed:', error);
    return res.status(500).json({ message: 'Unable to load analytics' });
  }
};
