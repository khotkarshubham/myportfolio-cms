import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      trim: true,
      maxlength: 200,
      required: true
    },

    role: {
      type: String,
      trim: true,
      maxlength: 200,
      required: true
    },

    startDate: {
      type: String,
      trim: true,
      maxlength: 100,
      required: true
    },

    endDate: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },

    technologies: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100
        }
      ],
      default: []
    },

    companyLogo: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/*
 * Prevent an unexpectedly large technology list.
 */
experienceSchema.path("technologies").validate(
  (value) =>
    Array.isArray(value) && value.length <= 30,
  "An experience entry can have a maximum of 30 technologies"
);

/*
 * Useful for experience listings.
 */
experienceSchema.index({
  createdAt: -1
});

const Experience = mongoose.model(
  "Experience",
  experienceSchema
);

export default Experience;
