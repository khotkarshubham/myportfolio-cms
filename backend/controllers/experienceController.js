import mongoose from "mongoose";
import Experience from "../models/Experience.js";
import {
  removeUploadFile,
  getUploadPath
} from "../middleware/uploadSecurity.js";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { logAdminAction } from "../utils/auditLogger.js";
import {
  earliestActivityStamp,
  sortRoles,
  toPublicOrganization
} from "../utils/experienceTimeline.js";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const parseOrder = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(500, Math.max(0, Math.round(parsed)));
};

const parseJsonMaybe = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeTechnologies = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return list
    .map((item) => sanitizeText(item, 50))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const normalizeAchievements = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\n+/)
      : [];

  return list
    .map((item) => sanitizeText(item, 240))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
};

const normalizeImpact = (value) => {
  const parsed = parseJsonMaybe(value);
  const list = Array.isArray(parsed)
    ? parsed
    : typeof value === "string"
      ? value.split(/\n+/).map((line) => {
          const [first, ...rest] = line.split("|");
          return {
            value: first,
            label: rest.join("|")
          };
        })
      : [];

  return list
    .map((item) => ({
      value: sanitizeText(item?.value || "", 40),
      label: sanitizeText(item?.label || "", 80)
    }))
    .filter((item) => item.value && item.label)
    .slice(0, 6);
};

const normalizeWebsite = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
};

const normalizeRole = (role, index) => {
  const title = sanitizeText(role?.role || "", 150);
  const startDate = sanitizeText(role?.startDate || "", 50);
  const isCurrent = parseBoolean(role?.isCurrent);
  const endDate = isCurrent
    ? ""
    : sanitizeText(role?.endDate || "", 50);

  return {
    _id: isValidObjectId(role?._id) ? role._id : undefined,
    role: title,
    startDate,
    endDate,
    description: sanitizeText(role?.description || "", 2000),
    technologies: normalizeTechnologies(role?.technologies),
    promotionLabel: sanitizeText(role?.promotionLabel || "", 40),
    achievements: normalizeAchievements(role?.achievements),
    impact: normalizeImpact(role?.impact),
    order: parseOrder(role?.order, index)
  };
};

const normalizeRoles = (value) => {
  const list = parseJsonMaybe(value);
  if (!Array.isArray(list)) return [];

  return list
    .map((role, index) => normalizeRole(role, index))
    .filter((role) => role.role && role.startDate)
    .slice(0, 20);
};

const normalizeOrganizationInput = (body = {}) => {
  const organization = sanitizeText(
    body.organization || body.company || "",
    150
  );

  const metaSource = parseJsonMaybe(body.organizationMeta);
  const meta = metaSource && typeof metaSource === "object" ? metaSource : {};

  return {
    organization,
    organizationMeta: {
      industry: sanitizeText(meta.industry || body.industry || "", 200),
      location: sanitizeText(meta.location || body.location || "", 200),
      website: normalizeWebsite(meta.website || body.website || "")
    },
    roles: normalizeRoles(body.roles),
    order: parseOrder(body.order, 0),
    isVisible: parseBoolean(body.isVisible, true)
  };
};

const removeCompanyLogo = async (logoUrl) => {
  if (!logoUrl || !logoUrl.startsWith("/uploads/")) return;

  const relativePath = logoUrl.replace(/^\/uploads\//, "");
  if (!relativePath || relativePath.includes("..")) return;

  try {
    await removeUploadFile(getUploadPath(relativePath));
  } catch (error) {
    console.error("Failed to remove company logo:", error?.message || error);
  }
};

const sortOrganizations = (docs) =>
  [...docs].sort((a, b) => {
    if ((a.order || 0) !== (b.order || 0)) {
      return (a.order || 0) - (b.order || 0);
    }

    return earliestActivityStamp(a) - earliestActivityStamp(b);
  });

export const getExperiences = async (req, res) => {
  try {
    const data = await Experience.find({
      isVisible: { $ne: false }
    }).lean();

    const organizations = sortOrganizations(data)
      .filter((doc) => Array.isArray(doc.roles) && doc.roles.length)
      .map(toPublicOrganization);

    return sendSuccess(res, organizations);
  } catch (error) {
    console.error("Get experiences error:", error);
    return sendError(res, "Unable to load experiences", 500);
  }
};

export const getAdminExperiences = async (req, res) => {
  try {
    const data = await Experience.find().lean();
    return sendSuccess(
      res,
      sortOrganizations(data).map(toPublicOrganization)
    );
  } catch (error) {
    console.error("Get admin experiences error:", error);
    return sendError(res, "Unable to load experiences", 500);
  }
};

export const createExperience = async (req, res) => {
  try {
    const input = normalizeOrganizationInput(req.body);

    if (!input.organization) {
      return sendError(res, "Organization name is required", 400);
    }

    if (!input.roles.length) {
      return sendError(res, "At least one role is required", 400);
    }

    const exp = await Experience.create({
      ...input,
      companyLogo: req.file
        ? `/uploads/experience/${req.file.filename}`
        : ""
    });

    await logAdminAction(req, {
      action: "CREATE_EXPERIENCE",
      entity: "EXPERIENCE",
      entityId: exp._id.toString()
    });

    return sendSuccess(res, toPublicOrganization(exp.toObject()), 201);
  } catch (error) {
    console.error("Create experience error:", error);

    if (req.file) {
      await removeCompanyLogo(
        `/uploads/experience/${req.file.filename}`
      );
    }

    return sendError(res, "Unable to create experience", 500);
  }
};

export const updateExperience = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, "Invalid experience ID", 400);
    }

    const existing = await Experience.findById(id);

    if (!existing) {
      return sendError(res, "Experience not found", 404);
    }

    const input = normalizeOrganizationInput({
      organization: req.body?.organization ?? existing.organization,
      organizationMeta: req.body?.organizationMeta ?? existing.organizationMeta,
      industry: req.body?.industry,
      location: req.body?.location,
      website: req.body?.website,
      roles: req.body?.roles ?? existing.roles,
      order: req.body?.order ?? existing.order,
      isVisible: req.body?.isVisible ?? existing.isVisible
    });

    if (!input.organization) {
      return sendError(res, "Organization name is required", 400);
    }

    if (!input.roles.length) {
      return sendError(res, "At least one role is required", 400);
    }

    existing.organization = input.organization;
    existing.organizationMeta = input.organizationMeta;
    existing.roles = input.roles.map((role) => ({
      ...role,
      _id: role._id || new mongoose.Types.ObjectId()
    }));
    existing.order = input.order;
    existing.isVisible = input.isVisible;

    if (req.file) {
      const previousLogo = existing.companyLogo;
      existing.companyLogo = `/uploads/experience/${req.file.filename}`;
      await existing.save();
      if (previousLogo) await removeCompanyLogo(previousLogo);
    } else {
      await existing.save();
    }

    await logAdminAction(req, {
      action: "UPDATE_EXPERIENCE",
      entity: "EXPERIENCE",
      entityId: existing._id.toString()
    });

    return sendSuccess(res, toPublicOrganization(existing.toObject()));
  } catch (error) {
    console.error("Update experience error:", error);

    if (req.file) {
      await removeCompanyLogo(
        `/uploads/experience/${req.file.filename}`
      );
    }

    return sendError(res, "Unable to update experience", 500);
  }
};

export const deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, "Invalid experience ID", 400);
    }

    const deleted = await Experience.findByIdAndDelete(id);

    if (!deleted) {
      return sendError(res, "Experience not found", 404);
    }

    if (deleted.companyLogo) {
      await removeCompanyLogo(deleted.companyLogo);
    }

    await logAdminAction(req, {
      action: "DELETE_EXPERIENCE",
      entity: "EXPERIENCE",
      entityId: deleted._id.toString()
    });

    return sendSuccess(res, { message: "Experience deleted" });
  } catch (error) {
    console.error("Delete experience error:", error);
    return sendError(res, "Unable to delete experience", 500);
  }
};

export const reorderExperiences = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

    if (!ids.length || ids.some((id) => !isValidObjectId(id))) {
      return sendError(res, "A valid organization order is required", 400);
    }

    await Promise.all(
      ids.map((id, index) =>
        Experience.findByIdAndUpdate(id, { order: index })
      )
    );

    await logAdminAction(req, {
      action: "REORDER_EXPERIENCE",
      entity: "EXPERIENCE"
    });

    return sendSuccess(res, { message: "Organizations reordered" });
  } catch (error) {
    console.error("Reorder experiences error:", error);
    return sendError(res, "Unable to reorder experiences", 500);
  }
};

export const sortRolesForSave = sortRoles;
