import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import Blog from "../models/Blog.js";
import Project from "../models/Project.js";
import Profile from "../models/Profile.js";
import Certification from "../models/Certification.js";
import Experience from "../models/Experience.js";
import { mediaConfig, mediaKey, storeInS3 } from "../services/mediaStorage.js";
import { mediaRelativePath } from "../utils/mediaLayout.js";

const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
const digest = body => createHash("sha256").update(body).digest("hex");

export async function organizeRecord({ model, record, field, uploadField, apply, root, client }) {
  const oldPath = record[field];
  if (!oldPath || typeof oldPath !== "string" || /^https?:\/\//i.test(oldPath)) return;
  const normalized = oldPath.replace(/\\/g, "/");
  const marker = normalized.indexOf("/uploads/");
  if (marker < 0) return;
  const sourcePath = normalized.slice(marker);
  if (/^\/uploads\/(images|document)\//.test(oldPath)) return;
  const config = mediaConfig();
  const oldKey = mediaKey(sourcePath, config);
  if (!oldKey) throw new Error(`Invalid source path for ${model.modelName}/${record._id}`);
  let body;
  try { body = await readFile(path.join(root, sourcePath.slice(9))); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: oldKey }));
    body = Buffer.from(await response.Body.transformToByteArray());
  }
  const mimetype = types[path.extname(oldPath).toLowerCase()];
  if (!mimetype) throw new Error(`Unsupported media: ${oldPath}`);
  const checksum = digest(body);
  const token = digest(Buffer.concat([Buffer.from(`${model.modelName}/${record._id}/${field}:`), body])).slice(0, 24);
  const relative = mediaRelativePath({ field: uploadField, originalname: path.basename(oldPath), mimetype,
    slug: record.slug || record.title || record.name || record.company || String(record._id), token });
  const publicPath = `/uploads/${relative}`;
  console.log(`${apply ? "COPY" : "PLAN"} ${oldKey} -> ${mediaKey(publicPath, config)}`);
  if (!apply) return;
  try { await storeInS3(body, publicPath, mimetype, { ifAbsent: true }); }
  catch (error) { if (error.$metadata?.httpStatusCode !== 412) throw error; }
  const object = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: mediaKey(publicPath, config) }));
  if (object.Metadata?.sha256 !== checksum || object.ContentLength !== body.length) throw new Error(`S3 verification failed: ${relative}`);
  const result = await model.updateOne({ _id: record._id, [field]: oldPath }, { $set: { [field]: publicPath } }, { runValidators: true });
  if (result.matchedCount !== 1) throw new Error("Content changed during migration. Pause CMS edits and rerun.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { apply: { type: "boolean", default: false } } });
  try {
    const config = mediaConfig();
    if (!process.env.MONGO_URI || !config.bucket || !config.region) throw new Error("MONGO_URI, S3_BUCKET and AWS_REGION are required");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    const client = new S3Client({ region: config.region, maxAttempts: 3 });
    const root = path.resolve(process.env.LEGACY_UPLOAD_DIR || process.env.UPLOAD_DIR || "uploads");
    // Fixed heroes are handled by migrate:heroes, using the original Nginx files.
    const collections = [
      [Blog, { image: "blogImage" }], [Project, { image: "projectImage" }],
      [Profile, { image: "image", resume: "resume" }],
      [Certification, { file: "certificate" }], [Experience, { companyLogo: "companyLogo" }]
    ];
    for (const [model, fields] of collections) {
      for await (const record of model.find().lean().cursor()) {
        for (const [field, uploadField] of Object.entries(fields)) {
          await organizeRecord({ model, record, field, uploadField, apply: values.apply, root, client });
        }
      }
    }
    console.log(values.apply ? "Media references updated. Old local and S3 files retained for rollback." : "Dry run complete; no files or records changed.");
  } catch (error) {
    console.error(`Media organization failed: ${error.name}. ${error.message}`);
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
