import mongoose from "mongoose";
import { isSkillIconKey } from "../utils/skillIconKeys.js";
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

    const iconKey = req.body.iconKey === undefined ? "" : req.body.iconKey;
    if (!isSkillIconKey(iconKey))
      return sendError(res, "Choose a supported skill icon", 400);
    const skill = await Skill.create({ name, iconKey });
    await logAdminAction(req, {
      action: "CREATE_SKILL",
      entity: "SKILL",
      entityId: skill._id.toString(),
    });
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

export const updateSkillIcon = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return sendError(res, "Invalid skill ID", 400);
  if (!isSkillIconKey(req.body?.iconKey))
    return sendError(res, "Choose a supported skill icon", 400);
  try {
    const skill = await Skill.findByIdAndUpdate(
      req.params.id,
      { $set: { iconKey: req.body.iconKey } },
      { new: true, runValidators: true },
    );
    if (!skill) return sendError(res, "Skill not found", 404);
    await logAdminAction(req, {
      action: "UPDATE_SKILL_ICON",
      entity: "SKILL",
      entityId: skill._id.toString(),
    });
    return sendSuccess(res, skill);
  } catch {
    return sendError(res, "Unable to update skill icon", 500);
  }
};

export const deleteSkill = async (req, res) => {
  try {
    const deleted = await Skill.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return sendError(res, "Skill not found", 404);
    }

    await logAdminAction(req, {
      action: "DELETE_SKILL",
      entity: "SKILL",
      entityId: deleted._id.toString(),
    });
    return sendSuccess(res, { message: "Skill deleted" });
  } catch (error) {
    return sendError(res, "Unable to delete skill", 500);
  }
};
