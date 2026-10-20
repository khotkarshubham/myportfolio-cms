import "dotenv/config";
import mongoose from "mongoose";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { mediaConfig, mediaKey, normalizeMediaPath } from "../services/mediaStorage.js";
import Blog from "../models/Blog.js";
import Project from "../models/Project.js";
import Profile from "../models/Profile.js";
import Certification from "../models/Certification.js";
import Experience from "../models/Experience.js";

// Read-only: no uploads, deletes, database writes, or credential values in output.
let failed = 0;
const report = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed++; };
try {
  const config = mediaConfig();
  report(process.env.NODE_ENV === "production", "NODE_ENV=production");
  report((process.env.JWT_SECRET || "").length >= 32, "JWT secret configured (32+ characters)");
  let origin;
  try { origin = new URL(process.env.FRONTEND_URL); } catch {}
  report(origin?.protocol === "https:" && origin.pathname === "/" && !origin.search && !origin.hash && !origin.username && !origin.password, "FRONTEND_URL is an HTTPS origin");
  const client = new S3Client({ region: config.region, maxAttempts: 1, requestHandler: { connectionTimeout: 5000, requestTimeout: 5000 } });
  const checked = new Set();
  async function checkAsset(publicPath, publicBase = config.publicUrl) {
    if (checked.has(publicPath)) return;
    checked.add(publicPath);
    const Key = mediaKey(publicPath, config);
    if (!Key) { report(false, "Invalid managed media reference"); return; }
    try {
      await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key }), { abortSignal: AbortSignal.timeout(6000) });
    } catch (error) {
      report(false, `S3 object ${Key} (${error.name}, HTTP ${error.$metadata?.httpStatusCode || "unavailable"})`);
    }
    if (publicBase) {
      try {
        const response = await fetch(`${publicBase}/${Key}`, { method: "HEAD", signal: AbortSignal.timeout(6000) });
        report(response.ok, `Public media ${Key} (HTTP ${response.status})`);
      } catch { report(false, `Public media ${Key} unreachable`); }
    }
  }
  report(config.bucket === "khotkarshubham.in" && config.region === "ap-south-1" && !config.prefix, "Storage matches fixed frontend hero URLs");
  const heroBase = "https://s3.ap-south-1.amazonaws.com/khotkarshubham.in";
  await checkAsset("/uploads/images/hero/home-light-mode.webp", heroBase);
  await checkAsset("/uploads/images/hero/home-dark-mode.webp", heroBase);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await mongoose.connection.db.admin().ping();
  report(true, "MongoDB reachable");
  const fields = [[Profile, ["image", "resume"]], [Blog, ["image"]], [Project, ["image"]], [Certification, ["file"]], [Experience, ["companyLogo"]]];
  for (const [model, names] of fields) {
    for await (const record of model.find().select(names.join(" ")).lean().cursor()) {
      for (const name of names) {
        const value = record[name];
        if (!value) continue;
        if (!normalizeMediaPath(value)) { report(false, `${model.modelName}.${name} needs migration (${record._id})`); continue; }
        await checkAsset(value);
      }
    }
  }
  console.log(`Checked ${checked.size} unique managed media references. No data changed.`);
} catch (error) { report(false, `Preflight stopped (${error.name}); check backend configuration and connectivity`); }
finally { await mongoose.disconnect(); }
process.exitCode = failed ? 1 : 0;
