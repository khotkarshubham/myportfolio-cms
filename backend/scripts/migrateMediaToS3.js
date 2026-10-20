import "dotenv/config";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { mediaConfig, mediaKey, storeInS3 } from "../services/mediaStorage.js";

const apply = process.argv.includes("--apply");
const config = mediaConfig();
const root = path.resolve(process.env.LEGACY_UPLOAD_DIR || process.env.UPLOAD_DIR || "uploads");
const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
const client = new S3Client({ region: config.region });
if (apply && (!config.bucket || !config.region)) throw new Error("Set S3_BUCKET and AWS_REGION before applying migration");

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename);
    else if (entry.isFile()) {
      const relative = path.relative(root, filename).split(path.sep).join("/");
      const publicPath = `/uploads/${relative}`;
      const Key = mediaKey(publicPath, config);
      const contentType = types[path.extname(filename).toLowerCase()];
      if (!Key || !contentType) throw new Error(`Unsupported file; resolve before cutover: ${relative}`);
      console.log(`${apply ? "COPY" : "PLAN"} ${relative} -> ${Key}`);
      if (!apply) continue;
      try { await storeInS3(await readFile(filename), publicPath, contentType, { ifAbsent: true }); }
      catch (error) {
        if (error.$metadata?.httpStatusCode !== 412) throw error;
        const existing = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key }));
        const checksum = createHash("sha256").update(await readFile(filename)).digest("hex");
        if (existing.Metadata?.sha256 !== checksum) throw new Error(`Existing object differs: ${Key}. No overwrite performed.`);
        console.log(`VERIFIED ${relative} already migrated`);
      }
    } else throw new Error(`Unsupported filesystem entry: ${filename}`);
  }
}

await walk(root);
console.log(apply ? "Copy complete. Source files and database references are unchanged." : "Dry run complete. No files uploaded. Run with --apply to copy.");
