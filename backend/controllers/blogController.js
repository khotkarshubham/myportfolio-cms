import Blog from "../models/Blog.js";
import { sanitizeHtml, sanitizeText } from "../utils/sanitizeHtml.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { removeUploadFile } from "../middleware/uploadSecurity.js";
import { logAdminAction } from "../utils/auditLogger.js";

/**
 * Build a predictable URL slug from a blog title.
 */
const buildSlug = (title) => {
  return String(title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
};

/**
 * Validate an uploaded blog image path before deleting it.
 *
 * This prevents a database value from being turned into an
 * arbitrary filesystem path.
 */
const getBlogUploadPath = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") {
    return null;
  }

  const normalized = imagePath.replace(/\\/g, "/");

  if (
    !normalized.startsWith("/uploads/blogs/") ||
    normalized.includes("..")
  ) {
    return null;
  }

  return normalized;
};

/**
 * Remove a blog image safely.
 */
const removeBlogImage = async (imagePath) => {
  const safePath = getBlogUploadPath(imagePath);

  if (!safePath) return;

  try {
    await removeUploadFile(safePath);
  } catch (error) {
    console.warn(
      "Unable to remove blog image:",
      error?.message || error
    );
  }
};

const normalizeManagedBlogImage = (value) => {
  const image = String(value || "").trim();
  return getBlogUploadPath(image) || "";
};

/**
 * Normalize blog tags.
 */
const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map((tag) => sanitizeText(tag, 50))
        .filter(Boolean)
    )
  ].slice(0, 20);
};

/**
 * Create blog
 */
export const createBlog = async (req, res) => {
  try {
    const title = sanitizeText(
      req.body?.title || "",
      200
    );

    const content = sanitizeHtml(
      req.body?.content || "",
      50000
    );

    const tags = normalizeTags(req.body?.tags);
    if (req.body?.status !== undefined && !["draft", "published"].includes(req.body.status)) return sendError(res, "Invalid publication status", 400);

    if (!title || !content) {
      return sendError(
        res,
        "Title and content are required",
        400
      );
    }

    const slug = buildSlug(title);

    if (!slug) {
      return sendError(
        res,
        "Title must contain letters or numbers",
        400
      );
    }

    const existing = await Blog.findOne({ slug })
      .select("_id")
      .lean();

    if (existing) {
      return sendError(
        res,
        "A blog with this title already exists",
        409
      );
    }

    let image = "";

    if (req.file) {
      image = `/uploads/blogs/${req.file.filename}`;
    } else if (req.body?.image) {
      image = normalizeManagedBlogImage(req.body.image);
      if (!image) {
        return sendError(res, "Image must be a managed blog upload", 400);
      }
    }

    const blog = await Blog.create({
      title,
      slug,
      content,
      image,
      tags,
      status: req.body.status || "published"
    });

    await logAdminAction(req, {
      action: "CREATE_BLOG",
      entity: "BLOG",
      entityId: blog._id,
      adminId: req.user?.id,
      email: req.user?.email
    });

    return sendSuccess(
      res,
      blog,
      201
    );
  } catch (error) {
    console.error("Create blog error:", error);

    /*
     * Handle MongoDB duplicate-slug race conditions.
     */
    if (error?.code === 11000) {
      return sendError(
        res,
        "A blog with this title already exists",
        409
      );
    }

    return sendError(
      res,
      "Unable to create blog",
      500
    );
  }
};

/**
 * Update blog
 */
export const updateBlog = async (req, res) => {
  try {
    const existing = await Blog.findById(
      req.params.id
    );

    if (!existing) {
      return sendError(
        res,
        "Blog not found",
        404
      );
    }

    /*
     * Preserve existing values when fields are omitted.
     */
    const title =
      req.body?.title !== undefined
        ? sanitizeText(req.body.title, 200)
        : existing.title;

    const content =
      req.body?.content !== undefined
        ? sanitizeHtml(req.body.content, 50000)
        : existing.content;

    if (!title || !content) {
      return sendError(
        res,
        "Title and content are required",
        400
      );
    }

    // Keep published links stable when an article title changes.
    const slug = existing.slug || buildSlug(title);

    if (!slug) {
      return sendError(
        res,
        "Title must contain letters or numbers",
        400
      );
    }

    const tags =
      req.body?.tags !== undefined
        ? normalizeTags(req.body.tags)
        : existing.tags || [];

    const duplicate = await Blog.findOne({
      slug,
      _id: { $ne: existing._id }
    })
      .select("_id")
      .lean();

    if (duplicate) {
      return sendError(
        res,
        "A blog with this title already exists",
        409
      );
    }

    const updates = {
      title,
      slug,
      content,
      tags
    };
    if (req.body?.status !== undefined) {
      if (!["draft", "published"].includes(req.body.status)) return sendError(res, "Invalid publication status", 400);
      updates.status = req.body.status;
    }

    /*
     * New image uploaded.
     */
    let previousImage = null;
    if (req.file) {
      updates.image = `/uploads/blogs/${req.file.filename}`;
      previousImage = existing.image;
    }

    /*
     * Explicitly remove existing image.
     */
    if (
      !req.file &&
      req.body?.image === ""
    ) {
      updates.image = "";
      previousImage = existing.image;
    }

    /*
     * Explicitly replace image path from a trusted source.
     */
    if (
      !req.file &&
      req.body?.image !== undefined &&
      req.body.image !== ""
    ) {
      updates.image = normalizeManagedBlogImage(req.body.image);
      if (!updates.image) {
        return sendError(res, "Image must be a managed blog upload", 400);
      }
      previousImage = existing.image;
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!blog) {
      return sendError(
        res,
        "Blog not found",
        404
      );
    }

    if (previousImage && previousImage !== updates.image) {
      await removeBlogImage(previousImage);
    }

    await logAdminAction(req, {
      action: "UPDATE_BLOG",
      entity: "BLOG",
      entityId: blog._id,
      adminId: req.user?.id,
      email: req.user?.email
    });

    return sendSuccess(
      res,
      blog
    );
  } catch (error) {
    console.error("Update blog error:", error);

    if (error?.code === 11000) {
      return sendError(
        res,
        "A blog with this title already exists",
        409
      );
    }

    return sendError(
      res,
      "Unable to update blog",
      500
    );
  }
};

/**
 * Get all blogs
 */
export const getAdminBlogs = async (req, res) => {
  try { return sendSuccess(res, await Blog.find().sort({ updatedAt: -1 }).lean()); }
  catch { return sendError(res, "Unable to load articles", 500); }
};

export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: { $ne: "draft" } })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(
      res,
      blogs
    );
  } catch (error) {
    console.error("Get blogs error:", error);

    return sendError(
      res,
      "Unable to load blogs",
      500
    );
  }
};

/**
 * Get blog by slug
 */
export const getBlogBySlug = async (req, res) => {
  try {
    const slug = String(
      req.params?.slug || ""
    )
      .trim()
      .toLowerCase();

    if (!slug) {
      return sendError(
        res,
        "Blog not found",
        404
      );
    }

    const blog = await Blog.findOne({
      slug,
      status: { $ne: "draft" }
    }).lean();

    if (!blog) {
      return sendError(
        res,
        "Blog not found",
        404
      );
    }

    return sendSuccess(
      res,
      blog
    );
  } catch (error) {
    console.error(
      "Get blog by slug error:",
      error
    );

    return sendError(
      res,
      "Unable to load blog",
      500
    );
  }
};

/**
 * Delete blog
 */
export const deleteBlog = async (req, res) => {
  try {
    const deleted = await Blog.findByIdAndDelete(
      req.params.id
    );

    if (!deleted) {
      return sendError(
        res,
        "Blog not found",
        404
      );
    }

    await removeBlogImage(
      deleted.image
    );

    await logAdminAction(req, {
      action: "DELETE_BLOG",
      entity: "BLOG",
      entityId: deleted._id,
      adminId: req.user?.id,
      email: req.user?.email
    });

    return sendSuccess(
      res,
      {
        message: "Blog deleted successfully"
      }
    );
  } catch (error) {
    console.error("Delete blog error:", error);

    return sendError(
      res,
      "Unable to delete blog",
      500
    );
  }
};
