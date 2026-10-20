import mongoose from "mongoose";
import { PROJECT_TYPES, PROJECT_STATUSES } from "../utils/projectInput.js";

const projectSchema = new mongoose.Schema(
{
  type: { type: String, enum: PROJECT_TYPES, default: "repository" },
  status: { type: String, enum: PROJECT_STATUSES, default: "completed" },
  outcome: { type: String, trim: true, maxlength: 300, default: "" },
  title:{
    type:String,
    required:true,
    trim: true,
    maxlength: 150
  },

  description:{
    type:String,
    required:true,
    trim: true,
    maxlength: 1000
  },

  image:{
    type:String,
    maxlength: 1000
  },

  github:{
    type:String,
    maxlength: 2048
  },

  demo:{
    type:String,
    maxlength: 2048
  },

  tech:[
    {
      type:String
    }
  ]
},
{
  timestamps:true
}
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
