import { skillIconKeys } from "../utils/skillIconKeys.js";
import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    iconKey: { type: String, enum: skillIconKeys, default: "" },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Prevent duplicate skill names regardless of capitalization.
 */
skillSchema.index({ name: 1 }, { unique: true });

/*
 * Useful for skill listings.
 */
skillSchema.index({
  createdAt: -1,
});

const Skill = mongoose.model("Skill", skillSchema);

export default Skill;
