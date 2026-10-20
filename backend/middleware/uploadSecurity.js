import multer from "multer";
import path from "node:path";
import { mediaRelativePath } from "../utils/mediaLayout.js";
import { normalizeMediaPath, storeInS3, deleteFromS3 } from "../services/mediaStorage.js";
import Blog from "../models/Blog.js";
import Project from "../models/Project.js";

const formats = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".pdf": "application/pdf"
};
const imageFields = new Set(["image", "projectImage", "blogImage", "companyLogo"]);
const typeAllowed = file => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (formats[extension] !== file.mimetype) return false;
  if (imageFields.has(file.fieldname)) return file.mimetype.startsWith("image/");
  if (file.fieldname === "resume") return file.mimetype === "application/pdf";
  return file.fieldname === "certificate";
};
const signatureType = buffer => {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
};
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => typeAllowed(file)
    ? cb(null, true)
    : cb(Object.assign(new Error("Unsupported file type"), { statusCode: 400 })),
  limits: { fileSize: 5 * 1024 * 1024, files: 2, fields: 30, fieldSize: 64 * 1024, parts: 32, fieldNameSize: 100, fieldNestingDepth: 2, fieldArrayIndexLimit: 30 }
});

const flattenFiles = files => !files ? [] : Array.isArray(files) ? files : files.fieldname ? [files] : Object.values(files).flat();
let activeUploads = 0;
const MAX_CONCURRENT_UPLOADS = 4;

const secureUpload = middleware => (req, res, next) => {
  if (req.params?.id && !/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid content ID" });
  }
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    res.setHeader("Retry-After", "5");
    return res.status(503).json({ success: false, message: "Uploads are busy. Please retry shortly." });
  }
  activeUploads++;
  let released = false;
  const release = () => { if (!released) { released = true; activeUploads--; } };
  // Do not release a slot during an in-flight S3 operation: aborted clients still consume resources.
  middleware(req, res, async error => {
    const files = flattenFiles(req.files || req.file);
    const promoted = [];
    const clearBuffers = () => { for (const file of files) delete file.buffer; };
    const cleanup = async () => {
      if (req.mediaCommitted) return;
      await Promise.all(promoted.map(publicPath => removeUploadFile(publicPath)));
    };
    if (error) { clearBuffers(); release(); return next(error); }
    try {
      for (const file of files) {
        if (!typeAllowed(file) || signatureType(file.buffer) !== file.mimetype) {
          throw Object.assign(new Error("File contents do not match the declared file type"), { statusCode: 400 });
        }
      }
      for (const file of files) {
        if (req.aborted || res.destroyed) throw Object.assign(new Error("Upload cancelled"), { statusCode: 400 });
        let slug = req.body?.title || req.body?.name || req.body?.organization || req.body?.company || req.params?.id;
        if (req.params?.id && ["blogImage", "projectImage"].includes(file.fieldname)) {
          const model = file.fieldname === "blogImage" ? Blog : Project;
          const existing = await model.findById(req.params.id);
          if (!existing) throw Object.assign(new Error("Content not found"), { statusCode: 404 });
          const category = file.fieldname === "blogImage" ? "blog" : "project";
          const previousFolder = existing.image?.match(new RegExp("^/uploads/images/" + category + "/([^/]+)/"))?.[1];
          slug = previousFolder || existing.slug || existing.title || slug;
        }
        const relative = mediaRelativePath({ field: file.fieldname, originalname: file.originalname, mimetype: file.mimetype, slug });
        file.path = `/uploads/${relative}`;
        file.filename = path.basename(relative);
        // Track before sending: a timed-out PUT may already have succeeded in S3.
        promoted.push(file.path);
        await storeInS3(file.buffer, file.path, file.mimetype);
        delete file.buffer;
      }
      if (req.aborted || res.destroyed) { await cleanup(); return; }
      res.once("finish", () => {
        if (!req.mediaCommitted && res.statusCode >= 400) void cleanup();
      });
      next();
    } catch (err) {
      await cleanup();
      if (!req.aborted && !res.destroyed) next(err);
    } finally { clearBuffers(); release(); }
  });
};

export const profileUpload = secureUpload(upload.fields([{ name: "image", maxCount: 1 }, { name: "resume", maxCount: 1 }]));
export const projectUpload = secureUpload(upload.single("projectImage"));
export const blogUpload = secureUpload(upload.single("blogImage"));
export const certificationUpload = secureUpload(upload.single("certificate"));
export const experienceUpload = secureUpload(upload.single("companyLogo"));

export const getUploadPath = file => {
  const value = typeof file === "string" ? file : file?.path;
  if (!value || typeof value !== "string") return "";
  return normalizeMediaPath(value.startsWith("/uploads/") ? value : `/uploads/${value}`) || "";
};
export const removeUploadFile = async value => {
  const publicPath = getUploadPath(value);
  if (!publicPath || publicPath.startsWith("/uploads/images/hero/")) return;
  try { await deleteFromS3(publicPath); }
  catch (error) { console.error("Media deletion failed:", publicPath, error.name); }
};
export const shouldKeepFile = value => !getUploadPath(value);
