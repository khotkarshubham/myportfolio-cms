import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
{
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
