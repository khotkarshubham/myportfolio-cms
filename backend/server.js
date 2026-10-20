import cookieParser from "cookie-parser";
import { csrfProtection } from "./middleware/csrfMiddleware.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import helmet from "helmet";
import mongoose from "mongoose";
import { normalizeOrigin, originAllowed } from "./utils/origins.js";
import { apiLimiter } from "./middleware/rateLimiters.js";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import certificationRoutes from "./routes/certificationRoutes.js";
import experienceRoutes from "./routes/experienceRoutes.js";
import adminManagementRoutes from "./routes/adminManagementRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

import { mediaConfig, mediaRedirect } from "./services/mediaStorage.js";
mediaConfig();

const app = express();

/* ================= ENV ================= */

const NODE_ENV = process.env.NODE_ENV || "development";

if (!["development", "test", "production"].includes(NODE_ENV)) {
  throw new Error("NODE_ENV must be development, test, or production");
}

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

/* ================= ORIGINS ================= */

/*
 * Normalize origins once so an accidental trailing slash in
 * FRONTEND_URL does not break production CORS.
 *
 * Example:
 *   https://example.com/
 * becomes:
 *   https://example.com
 */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
  NODE_ENV !== "production" ? "http://localhost:5173" : null,
  NODE_ENV !== "production" ? "http://localhost:3000" : null
]
  .map(value => normalizeOrigin(value, NODE_ENV === "production"))
  .filter(Boolean)
  .filter((origin, index, origins) => origins.indexOf(origin) === index);

if (NODE_ENV === "production" && allowedOrigins.length === 0) {
  throw new Error(
    "At least one valid FRONTEND_URL is required in production"
  );
}

/* ================= PROXY ================= */

/*
 * `req.ip` is used by the analytics controller.
 *
 * Only trust a single reverse proxy hop. This is appropriate
 * for the common setup:
 *
 * Browser -> Nginx / Load Balancer -> Node
 *
 * It prevents clients from supplying arbitrary multi-hop
 * X-Forwarded-For values and having Express blindly trust them.
 */
app.set("trust proxy", 1);

/* ================= CORS ================= */

const isAllowedOrigin = origin => originAllowed(origin, allowedOrigins);

const corsOptions = {
  origin: (origin, callback) => {
    /*
     * Requests without an Origin header include:
     * curl, Postman, server-to-server requests, etc.
     */
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS policy violation"));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Protection"
  ]
};

/* ================= DATABASE ================= */

await connectDB();

/* ================= SECURITY ================= */

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

/* ================= CORS ================= */

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use("/api", apiLimiter);
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", csrfProtection(allowedOrigins));
app.use("/api", (req, res, next) => {
  if (req.cookies?.token) return csrfProtection(allowedOrigins)(req, res, next);
  next();
});

/* ================= BODY PARSER ================= */

app.use(
  express.json({
    limit: "10kb"
  })
);

app.use(
  express.urlencoded({
    extended: false,
    parameterLimit: 50,
    limit: "10kb"
  })
);

/* Stable media references redirect to S3; the server never serves local uploads. */
app.use("/uploads", mediaRedirect);

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminManagementRoutes);
app.use("/api/admin", activityLogRoutes);

app.use("/api/contact", contactRoutes);

app.use("/api", analyticsRoutes);
app.use("/api", certificationRoutes);
app.use("/api", experienceRoutes);

app.use("/api", healthRoutes);

/* ================= HEALTH / ROOT ================= */

app.get("/", (req, res) => {
  res.status(200).json({ status: "running" });
});

app.get("/api", (req, res) => {
  res.json({ status: "running" });
});

/* ================= 404 ================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/* ================= ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error("Request failed:", err.name, err.statusCode || err.status || 500);
  if (res.headersSent) return next(err);

  if (err.message === "CORS policy violation") {
    return res.status(403).json({
      error: "CORS policy violation"
    });
  }

  let statusCode =
    err.statusCode ||
    err.status ||
    500;

  if (err.name === "MulterError") statusCode = 400;
  if (err.name === "CastError") statusCode = 400;
  if (err.name === "ValidationError") statusCode = 400;
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
  }

  if (err.message === "Unsupported file type") {
    statusCode = 400;
  }

  const safeClientErrors = new Set([
    400,
    401,
    403,
    404,
    409,
    413,
    429
  ]);

  return res.status(statusCode).json({
    success: false,
    message: safeClientErrors.has(statusCode)
      ? err.message
      : "Internal Server Error"
  });
});

/* ================= SERVER ================= */

const PORT = Number(process.env.PORT) || 4000;

const server = http.createServer(app);

/* ================= SOCKET.IO ================= */

const io = new Server(server, {
  allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
  maxHttpBufferSize: 16 * 1024,
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy violation"));
    },

    methods: ["GET", "POST"],
    credentials: true
  }
});

let liveUsers = 0;

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  liveUsers += 1;

  io.emit("liveUsers", liveUsers);

  socket.on("disconnect", () => {
    liveUsers = Math.max(0, liveUsers - 1);

    io.emit("liveUsers", liveUsers);
  });
});

/* ================= START ================= */

server.requestTimeout = 120000;
server.headersTimeout = 15000;
const HOST = process.env.HOST || (NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0");
server.listen(PORT, HOST, () => {
  console.log(
    `Server running on port ${PORT} (${NODE_ENV})`
  );
});

let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 15000);
  timeout.unref();
  // Socket.IO also closes its attached HTTP server.
  io.close(async () => {
    await mongoose.disconnect();
    clearTimeout(timeout);
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
