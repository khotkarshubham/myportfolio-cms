import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const mediaConfig = (env = process.env) => {
  const driver = env.MEDIA_STORAGE || "local";
  if (!["local", "s3"].includes(driver)) throw new Error("MEDIA_STORAGE must be local or s3");
  const prefix = env.S3_PREFIX ?? "";
  const legacyPrefix = env.S3_LEGACY_PREFIX ?? env.S3_PREFIX ?? "portfolio/production";
  if ([prefix, legacyPrefix].some(value => value && !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(value))) throw new Error("Invalid S3_PREFIX");
  if (driver === "s3" && (!env.S3_BUCKET || !env.AWS_REGION)) throw new Error("S3_BUCKET and AWS_REGION are required for S3 media");
  const publicUrl = (env.MEDIA_PUBLIC_URL || "").replace(/\/$/, "");
  if (publicUrl) {
    const url = new URL(publicUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("MEDIA_PUBLIC_URL must be a clean HTTPS URL");
  }
  return { driver, prefix, legacyPrefix, bucket: env.S3_BUCKET, region: env.AWS_REGION, publicUrl };
};

// Database URLs are provider-independent; only this layer knows the bucket layout.
export const mediaKey = (value, config = mediaConfig()) => {
  if (typeof value !== "string" || !value.startsWith("/uploads/")) return null;
  const relative = value.slice(9);
  if (!relative || !relative.split("/").every(part => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part) && !part.includes(".."))) return null;
  const prefix = /^(images|document)\//.test(relative) ? config.prefix : config.legacyPrefix;
  return [prefix, relative].filter(Boolean).join("/");
};

let client;
const s3 = () => client ||= new S3Client({ region: mediaConfig().region, maxAttempts: 3 });

export const storeInS3 = async (filePath, publicPath, contentType, options = {}) => {
  const config = mediaConfig();
  const Key = mediaKey(publicPath, config);
  if (!Key) throw new Error("Invalid managed media path");
  const body = await readFile(filePath);
  return s3().send(new PutObjectCommand({
    Bucket: config.bucket, Key, Body: body, ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: { sha256: createHash("sha256").update(body).digest("hex") },
    ...(options.ifAbsent ? { IfNoneMatch: "*" } : {})
  }));
};

export const deleteFromS3 = async (publicPath) => {
  const config = mediaConfig();
  const Key = mediaKey(publicPath, config);
  if (!Key) return;
  await s3().send(new DeleteObjectCommand({ Bucket: config.bucket, Key }));
};

export const mediaRedirect = async (req, res, next) => {
  const config = mediaConfig();
  if (config.driver !== "s3") return next();
  if (!["GET", "HEAD"].includes(req.method)) return res.sendStatus(405);
  let publicPath;
  try { publicPath = `/uploads${decodeURIComponent(req.path)}`; } catch { return res.sendStatus(400); }
  const Key = mediaKey(publicPath, config);
  if (!Key) return res.sendStatus(404);
  try {
    const location = config.publicUrl
      ? `${config.publicUrl}/${Key.split("/").map(encodeURIComponent).join("/")}`
      : await getSignedUrl(s3(), new GetObjectCommand({ Bucket: config.bucket, Key }), { expiresIn: 900 });
    res.setHeader("Cache-Control", config.publicUrl ? "public, max-age=300" : "no-store");
    return res.redirect(302, location);
  } catch (error) { return next(error); }
};
