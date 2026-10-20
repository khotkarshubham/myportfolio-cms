import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Shubham Khotkar"
    },

    title: {
      type: String,
      trim: true,
      maxlength: 300,
      default:
        "DevOps Engineer specializing in cloud infrastructure, CI/CD automation, and scalable systems."
    },

    heroLight: { type: String, default: "", maxlength: 1000 },
    heroDark: { type: String, default: "", maxlength: 1000 },

    image: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    /*
     * CMS-managed resume path.
     *
     * Keep this as a relative upload path rather than
     * accepting arbitrary filesystem paths.
     */
    resume: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    github: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "https://github.com/khotkarshubham"
    },

    linkedin: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "https://www.linkedin.com/in/shubhamkhotkar/"
    },

    instagram: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "https://www.instagram.com/khotkarshubham/"
    },

    whatsapp: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "919270702964"
    },

    email: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "khotkarshubham@hotmail.com"
    }
  },
  {
    timestamps: true
  }
);

const Profile = mongoose.model(
  "Profile",
  profileSchema
);

export default Profile;
