import Skill from "../models/Skill.js";
import { sanitizeText } from "../utils/sanitizeHtml.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { logAdminAction } from "../utils/auditLogger.js";

export const createSkill = async (req, res) => {
  try {
    const name = sanitizeText(req.body.name || "", 100);

    if (!name) {
      return sendError(res, "Skill name is required", 400);
    }

    const skill = await Skill.create({ name });
    await logAdminAction(req, { action: "CREATE_SKILL", entity: "SKILL", entityId: skill._id.toString() });
    return sendSuccess(res, skill, 201);
  } catch (error) {
    return sendError(res, "Unable to create skill", 500);
  }
};

export const getSkills = async (req, res) => {
  try {
    const skills = await Skill.find().sort({ createdAt: -1 }).lean();
    return sendSuccess(res, skills);
  } catch (error) {
    return sendError(res, "Unable to load skills", 500);
  }
};

export const deleteSkill = async (req, res) => {
  try {
    const deleted = await Skill.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return sendError(res, "Skill not found", 404);
    }

    await logAdminAction(req, { action: "DELETE_SKILL", entity: "SKILL", entityId: deleted._id.toString() });
    return sendSuccess(res, { message: "Skill deleted" });
  } catch (error) {
    return sendError(res, "Unable to delete skill", 500);
  }
};
