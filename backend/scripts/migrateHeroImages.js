import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import Profile from "../models/Profile.js";
import { mediaConfig, mediaKey, storeInS3 } from "../services/mediaStorage.js";

const hash = body => createHash("sha256").update(body).digest("hex");

export async function migrateHeroes({ sourceDir, apply = false, uploadDir = process.env.UPLOAD_DIR || "uploads" }) {
  const config = mediaConfig();
  const assets = await Promise.all(["light", "dark"].map(async theme => {
    const filename = `home-${theme}-mode.webp`;
    const source = path.resolve(sourceDir, filename);
    const body = await readFile(source);
    if (body.length < 12 || body.toString("ascii", 0, 4) !== "RIFF" || body.toString("ascii", 8, 12) !== "WEBP") {
      throw new Error(`Not a WebP image: ${filename}`);
    }
    const relative = `hero/${theme}/${filename}`;
    return { source, body, relative, publicPath: `/uploads/${relative}`, field: theme === "light" ? "heroLight" : "heroDark", checksum: hash(body) };
  }));
  for (const asset of assets) console.log(`${apply ? "COPY" : "PLAN"} ${asset.source} -> ${mediaKey(asset.publicPath, config)}`);
  if (!apply) {
    console.log("Dry run: no files or profile data changed. Use --apply to copy and link both heroes.");
    return;
  }
  if (!config.bucket || !config.region) throw new Error("S3_BUCKET and AWS_REGION are required");
  const profile = await Profile.findOne().lean();
  if (!profile) throw new Error("Configure the profile in the CMS before migrating heroes");
  for (const asset of assets) {
    if (profile[asset.field] && profile[asset.field] !== asset.publicPath) {
      throw new Error(`${asset.field} already has a different image. Migration will not overwrite it.`);
    }
  }
  const client = new S3Client({ region: config.region, maxAttempts: 3 });
  for (const asset of assets) {
    // Retain matching local copies so the profile works before and after S3 cutover.
    const localPath = path.resolve(uploadDir, asset.relative);
    await mkdir(path.dirname(localPath), { recursive: true });
    try { await writeFile(localPath, asset.body, { flag: "wx" }); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (hash(await readFile(localPath)) !== asset.checksum) throw new Error(`Local destination differs: ${asset.relative}`);
    }
    try { await storeInS3(localPath, asset.publicPath, "image/webp", { ifAbsent: true }); }
    catch (error) { if (error.$metadata?.httpStatusCode !== 412) throw error; }
    const existing = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: mediaKey(asset.publicPath, config) }));
    if (existing.Metadata?.sha256 !== asset.checksum || existing.ContentLength !== asset.body.length) {
      throw new Error(`S3 verification failed: ${asset.relative}. Profile was not changed.`);
    }
    console.log(`VERIFIED ${asset.relative}`);
  }
  // Both images must be verified before publishing references. Protect concurrent CMS edits.
  const filter = { _id: profile._id };
  const updates = {};
  for (const asset of assets) {
    filter[asset.field] = profile[asset.field] ?? null;
    updates[asset.field] = asset.publicPath;
  }
  const result = await Profile.updateOne(filter, { $set: updates }, { runValidators: true });
  if (result.matchedCount !== 1) throw new Error("Profile changed during migration. Rerun after checking its hero settings.");
  console.log("Both hero images are linked. Source files retained. No frontend rebuild or manual upload is needed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: {
    "source-dir": { type: "string", default: "/var/www/nginx/portfolio-web" },
    apply: { type: "boolean", default: false }
  } });
  try {
    if (values.apply) {
      if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required to link the hero images");
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    }
    await migrateHeroes({ sourceDir: values["source-dir"], apply: values.apply });
  } catch (error) {
    console.error(`Hero migration failed: ${error.name}. ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
