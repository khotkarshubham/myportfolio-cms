import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { promisify } from "util";

const unlink = promisify(fs.unlink);

const uploadRoot = path.resolve(
  process.env.UPLOAD_DIR || "uploads"
);

const profileDir = path.join(uploadRoot, "profile");
const resumeDir = path.join(uploadRoot, "resume");
const projectDir = path.join(uploadRoot, "projects");
const blogDir = path.join(uploadRoot, "blogs");
const certificationDir = path.join(
  uploadRoot,
  "certifications"
);
const experienceDir = path.join(
  uploadRoot,
  "experience"
);

const uploadDirectories = [
  uploadRoot,
  profileDir,
  resumeDir,
  projectDir,
  blogDir,
  certificationDir,
  experienceDir
];

for (const directory of uploadDirectories) {
  fs.mkdirSync(directory, {
    recursive: true
  });
}

/**
 * Allowed upload definitions.
 */
const allowedFiles = {
  image: {
    directory: profileDir,
    mimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp"
    ]),
    extensions: new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ]),
    signatures: ["jpeg", "png", "webp"]
  },

  resume: {
    directory: resumeDir,
    mimeTypes: new Set([
      "application/pdf"
    ]),
    extensions: new Set([
      ".pdf"
    ]),
    signatures: ["pdf"]
  },

  projectImage: {
    directory: projectDir,
    mimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp"
    ]),
    extensions: new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ]),
    signatures: ["jpeg", "png", "webp"]
  },

  blogImage: {
    directory: blogDir,
    mimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp"
    ]),
    extensions: new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ]),
    signatures: ["jpeg", "png", "webp"]
  },

  certificate: {
    directory: certificationDir,
    mimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf"
    ]),
    extensions: new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".pdf"
    ]),
    signatures: [
      "jpeg",
      "png",
      "webp",
      "pdf"
    ]
  },

  companyLogo: {
    directory: experienceDir,
    mimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp"
    ]),
    extensions: new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp"
    ]),
    signatures: ["jpeg", "png", "webp"]
  }
};

/**
 * Resolve upload configuration for a field.
 *
 * Supports names such as:
 * image / imageFile
 * certificate / certificateFile
 */
const getFileConfig = (fieldname) => {
  if (!fieldname) return null;

  return (
    allowedFiles[fieldname] ||
    allowedFiles[fieldname.replace(/File$/i, "")] ||
    null
  );
};

/**
 * Verify extension and client-provided MIME type.
 */
const validateDeclaredFileType = (file) => {
  const config = getFileConfig(file.fieldname);

  if (!config) {
    return false;
  }

  const extension = path
    .extname(file.originalname || "")
    .toLowerCase();

  return (
    config.mimeTypes.has(file.mimetype) &&
    config.extensions.has(extension)
  );
};

/**
 * Detect the actual file format from its binary signature.
 */
const detectFileSignature = (buffer) => {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // JPEG: FF D8 FF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  // PDF: %PDF-
  if (
    buffer.length >= 5 &&
    buffer.toString("ascii", 0, 5) === "%PDF-"
  ) {
    return "pdf";
  }

  return null;
};

/**
 * Validate the actual binary contents of a stored upload.
 */
const validateFileSignature = async (file) => {
  const config = getFileConfig(file.fieldname);

  if (!config || !file.path) {
    return false;
  }

  try {
    const fileHandle = await fs.promises.open(
      file.path,
      "r"
    );

    try {
      const buffer = Buffer.alloc(32);

      const { bytesRead } = await fileHandle.read(
        buffer,
        0,
        buffer.length,
        0
      );

      const signature = detectFileSignature(
        buffer.subarray(0, bytesRead)
      );

      return Boolean(
        signature &&
        config.signatures.includes(signature)
      );
    } finally {
      await fileHandle.close();
    }
  } catch {
    return false;
  }
};

/**
 * Safely resolve paths inside the configured upload root.
 */
const resolveUploadPath = (filePath) => {
  if (!filePath) return null;

  const absolutePath = path.resolve(
    typeof filePath === "string" &&
      filePath.startsWith("/uploads/")
      ? path.join(
          uploadRoot,
          filePath.replace(/^\/uploads\//, "")
        )
      : filePath
  );

  const relativePath = path.relative(
    uploadRoot,
    absolutePath
  );

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return absolutePath;
};

/**
 * Safely delete a filesystem path.
 */
const safelyDeleteFile = async (filePath) => {
  const absolutePath = resolveUploadPath(filePath);

  if (!absolutePath) {
    return;
  }

  try {
    await unlink(absolutePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(
        "Unable to remove uploaded file:",
        error?.message || error
      );
    }
  }
};

/**
 * Validate files after Multer has written them.
 */
const validateUploadedFiles = async (files) => {
  const uploadedFiles = Array.isArray(files)
    ? files
    : Object.values(files || {}).flat();

  for (const file of uploadedFiles) {
    if (!validateDeclaredFileType(file)) {
      await safelyDeleteFile(file.path);

      const error = new Error(
        "Unsupported or invalid file type"
      );

      error.code = "INVALID_FILE_TYPE";

      throw error;
    }

    const signatureValid =
      await validateFileSignature(file);

    if (!signatureValid) {
      await safelyDeleteFile(file.path);

      const error = new Error(
        "File contents do not match the declared file type"
      );

      error.code = "INVALID_FILE_SIGNATURE";

      throw error;
    }
  }
};

/**
 * Wrap Multer with binary file validation.
 */
const secureUpload = (middleware) => {
  return async (req, res, next) => {
    middleware(req, res, async (error) => {
      if (error) {
        return next(error);
      }

      try {
        await validateUploadedFiles(
          req.files || req.file
        );

        return next();
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message:
            validationError?.message ||
            "Invalid uploaded file"
        });
      }
    });
  };
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const config = getFileConfig(
      file.fieldname
    );

    if (!config) {
      return cb(
        new Error("Unsupported upload field")
      );
    }

    cb(null, config.directory);
  },

  filename: (req, file, cb) => {
    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    const safeName = `${Date.now()}-${crypto
      .randomBytes(16)
      .toString("hex")}${extension}`;

    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (!validateDeclaredFileType(file)) {
    return cb(
      new Error("Unsupported file type")
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fields: 30,
    fieldSize: 1024 * 1024
  }
});

/**
 * Profile uploads.
 */
export const profileUpload = secureUpload(
  upload.fields([
    {
      name: "image",
      maxCount: 1
    },
    {
      name: "resume",
      maxCount: 1
    }
  ])
);

/**
 * Project image upload.
 */
export const projectUpload = secureUpload(
  upload.single("projectImage")
);

/**
 * Blog image upload.
 */
export const blogUpload = secureUpload(
  upload.single("blogImage")
);

/**
 * Certification upload.
 */
export const certificationUpload =
  secureUpload(
    upload.single("certificate")
  );

/**
 * Experience/company logo upload.
 */
export const experienceUpload =
  secureUpload(
    upload.single("companyLogo")
  );

/**
 * Convert a Multer file into its public upload path.
 */
export const getUploadPath = (file) => {
  const filePath = typeof file === "string" ? file : file?.path;

  if (!filePath) {
    return "";
  }

  const absolutePath = path.resolve(
    filePath.startsWith("/uploads/")
      ? path.join(uploadRoot, filePath.replace(/^\/uploads\//, ""))
      : path.isAbsolute(filePath)
        ? filePath
        : path.join(uploadRoot, filePath)
  );

  const relativePath = path.relative(
    uploadRoot,
    absolutePath
  );

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    return "";
  }

  return `/uploads/${relativePath.replace(
    /\\/g,
    "/"
  )}`;
};

/**
 * Remove an uploaded file safely.
 *
 * Accepts:
 *   /uploads/projects/example.jpg
 * or an absolute filesystem path.
 */
export const removeUploadFile = async (
  filePath
) => {
  await safelyDeleteFile(filePath);
};

/**
 * Determine whether a file is a default profile asset
 * that should be preserved.
 */
export const shouldKeepFile = (filePath) => {
  if (!filePath) {
    return false;
  }

  const normalized = String(filePath)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  return (
    normalized === "Profile.png" ||
    normalized.endsWith("/Profile.png")
  );
};
