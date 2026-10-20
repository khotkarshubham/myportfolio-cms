import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";


export const mediaConfig = (env = process.env) => {
  const driver = env.MEDIA_STORAGE || "s3";
  if (driver !== "s3") throw new Error("Local media storage is retired. Set MEDIA_STORAGE=s3 after completing migration.");
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
export const normalizeMediaPath = value => {
  if (typeof value !== "string" || !value.startsWith("/uploads/")) return null;
  const relative = value.slice(9);
  if (!relative || !relative.split("/").every(part => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part) && !part.includes(".."))) return null;
  if (!/^(images\/(hero|blog|project|profile|experience|certification)|document\/(resume|certification)|blogs|projects|profile|resume|hero|experience|certifications)\//.test(relative)) return null;
  return value;
};

export const mediaKey = (value, config = mediaConfig()) => {
  const normalized = normalizeMediaPath(value);
  if (!normalized) return null;
  const relative = normalized.slice(9);
  const prefix = /^(images|document)\//.test(relative) ? config.prefix : config.legacyPrefix;
  return [prefix, relative].filter(Boolean).join("/");
};

let client;
const s3 = () => client ||= new S3Client({ region: mediaConfig().region, maxAttempts: 3, requestHandler: { connectionTimeout: 5000, requestTimeout: 15000 } });

export const storeInS3 = async (body, publicPath, contentType, options = {}) => {
  const config = mediaConfig();
  const Key = mediaKey(publicPath, config);
  if (!Key) throw new Error("Invalid managed media path");
  if (!Buffer.isBuffer(body)) throw new Error("S3 uploads require a Buffer");
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

let healthResult;
let healthExpires = 0;
let healthPending;
export const checkMediaStorage = async () => {
  if (Date.now() < healthExpires) return healthResult;
  if (healthPending) return healthPending;
  healthPending = (async () => {
    try {
      const config = mediaConfig();
      await s3().send(new HeadObjectCommand({
        Bucket: config.bucket,
        Key: mediaKey("/uploads/images/hero/home-light-mode.webp", config)
      }), { abortSignal: AbortSignal.timeout(4000) });
      healthResult = true;
    } catch { healthResult = false; }
    healthExpires = Date.now() + 30000;
    return healthResult;
  })();
  try { return await healthPending; } finally { healthPending = undefined; }
};

export const mediaRedirect = async (req, res, next) => {
  const config = mediaConfig();
  if (!["GET", "HEAD"].includes(req.method)) return res.sendStatus(405);
  let publicPath;
  try { publicPath = `/uploads${decodeURIComponent(req.path)}`; } catch { return res.sendStatus(400); }
  const Key = mediaKey(publicPath, config);
  if (!Key) return res.sendStatus(404);
  try {
    const location = config.publicUrl
      ? `${config.publicUrl}/${Key.split("/").map(encodeURIComponent).join("/")}`
      : await getSignedUrl(s3(), new (req.method === "HEAD" ? HeadObjectCommand : GetObjectCommand)({ Bucket: config.bucket, Key }), { expiresIn: 900 });
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, location);
  } catch (error) { return next(error); }
};
