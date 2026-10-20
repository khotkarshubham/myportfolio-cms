import Project from "../models/Project.js";
import { projectInput } from "../utils/projectInput.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  removeUploadFile,
  getUploadPath,
} from "../middleware/uploadSecurity.js";
import { logAdminAction } from "../utils/auditLogger.js";

const validId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
const projectImage = (value) => {
  const path = getUploadPath(value);
  return ["/uploads/projects/", "/uploads/images/project/"].some((prefix) =>
    path.startsWith(prefix),
  )
    ? path
    : "";
};
const fail = (res, error, action) =>
  sendError(
    res,
    error.statusCode === 400 ? error.message : `Unable to ${action} project`,
    error.statusCode === 400 || error.name === "ValidationError" ? 400 : 500,
  );

export const createProject = async (req, res) => {
  const image = req.file ? projectImage(req.file) : "";
  try {
    const fields = projectInput(req.body);
    if (req.body?.image)
      return sendError(res, "Upload a new image for this project", 400);
    const project = await Project.create({ ...fields, image });
    req.mediaCommitted = true;
    await logAdminAction(req, {
      action: "CREATE_PROJECT",
      entity: "PROJECT",
      entityId: project._id.toString(),
    });
    return sendSuccess(res, project, 201);
  } catch (error) {
    if (image && !req.mediaCommitted) await removeUploadFile(image);
    return fail(res, error, "create");
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    return sendSuccess(
      res,
      projects.map((project) => ({
        ...project,
        type: project.type || "repository",
        status: project.status || "completed",
      })),
    );
  } catch {
    return sendError(res, "Unable to load projects", 500);
  }
};

export const updateProject = async (req, res) => {
  const image = req.file ? projectImage(req.file) : "";
  try {
    if (!validId(req.params.id))
      return sendError(res, "Invalid project ID", 400);
    const existing = await Project.findById(req.params.id);
    if (!existing) return sendError(res, "Project not found", 404);
    const updates = projectInput(req.body, existing);
    if (req.file) updates.image = image;
    else if (req.body?.image !== undefined) {
      if (
        typeof req.body.image !== "string" ||
        (req.body.image && req.body.image !== existing.image)
      ) {
        return sendError(
          res,
          "Upload a new image or remove the existing image",
          400,
        );
      }
      updates.image = req.body.image;
    }
    const project = await Project.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!project) return sendError(res, "Project not found", 404);
    req.mediaCommitted = true;
    if (updates.image !== undefined && existing.image !== updates.image)
      await removeUploadFile(projectImage(existing.image));
    await logAdminAction(req, {
      action: "UPDATE_PROJECT",
      entity: "PROJECT",
      entityId: project._id.toString(),
    });
    return sendSuccess(res, project);
  } catch (error) {
    if (image && !req.mediaCommitted) await removeUploadFile(image);
    return fail(res, error, "update");
  }
};

export const deleteProject = async (req, res) => {
  try {
    if (!validId(req.params.id))
      return sendError(res, "Invalid project ID", 400);
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return sendError(res, "Project not found", 404);
    await removeUploadFile(projectImage(project.image));
    await logAdminAction(req, {
      action: "DELETE_PROJECT",
      entity: "PROJECT",
      entityId: project._id.toString(),
    });
    return sendSuccess(res, { message: "Project deleted" });
  } catch (error) {
    return fail(res, error, "delete");
  }
};
