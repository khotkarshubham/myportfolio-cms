import mongoose from "mongoose";
import { checkMediaStorage } from "../services/mediaStorage.js";
import os from "os";

const SERVICE_NAME = "portfolio-backend";
const NODE_ENV = process.env.NODE_ENV || "development";

const REQUIRED_ENV_VARS = ["MONGO_URI", "JWT_SECRET", "S3_BUCKET", "AWS_REGION"];

const TRACKED_ENV_VARS = [
  "MONGO_URI",
  "JWT_SECRET",
  "NODE_ENV",
  "PORT",
  "FRONTEND_URL",
  "FRONTEND_URL_WWW",
  "EMAIL_USER",
  "EMAIL_PASS",
  "CONTACT_RECEIVER",
  "IP_HASH_SALT",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD"
];

const MONGO_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

const getMongoConnectionStatus = () => {
  const readyState = mongoose.connection.readyState;

  return {
    connected: readyState === 1,
    state: MONGO_STATES[readyState] || "unknown"
  };
};

const checkRequiredEnvVars = () => {
  const details = {};
  let allPresent = true;

  for (const key of REQUIRED_ENV_VARS) {
    const present = Boolean(process.env[key]);

    details[key] = present;

    if (!present) {
      allPresent = false;
    }
  }

  return {
    allPresent,
    details
  };
};

const getEnvAvailability = () => {
  const availability = {};

  for (const key of TRACKED_ENV_VARS) {
    availability[key] = Boolean(process.env[key]);
  }

  return availability;
};

export const getHealth = (req, res) => {
  try {
    res.status(200).json({
      status: "healthy",
      service: SERVICE_NAME,
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch {
    res.status(500).json({
      status: "unhealthy",
      message: "Health check failed"
    });
  }
};

export const getReadiness = async (req, res) => {
  try {
    const mongo = getMongoConnectionStatus();
    const envCheck = checkRequiredEnvVars();
    const mediaReady = await checkMediaStorage();

    const checks = {
      mongodb: mongo.connected,
      environment_variables: envCheck.allPresent,
      s3_media: mediaReady
    };

    const ready = Object.values(checks).every(Boolean);

    if (ready) {
      return res.status(200).json({
        status: "ready"
      });
    }

    return res.status(503).json({
      status: "not_ready",
      checks
    });
  } catch {
    return res.status(503).json({
      status: "not_ready",
      checks: {
        mongodb: false,
        environment_variables: false,
        s3_media: false
      }
    });
  }
};

export const getHealthDetails = async (req, res) => {
  try {
    const mongo = getMongoConnectionStatus();
    const mediaReady = await checkMediaStorage();

    res.status(200).json({
      status: mongo.connected && mediaReady ? "healthy" : "degraded",
      environment: NODE_ENV,
      nodeVersion: process.version,
      platform: os.platform(),
      architecture: os.arch(),
      hostname: os.hostname(),
      pid: process.pid,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: {
        loadAverage: os.loadavg()
      },
      mongodb: {
        connected: mongo.connected,
        state: mongo.state
      },
      mediaStorage: { provider: "s3", readable: mediaReady },
      environmentVariables: getEnvAvailability()
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve health details"
    });
  }
};