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

    image: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "/Profile.png"
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
