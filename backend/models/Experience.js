import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
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
    promotionLabel: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
      max: 200
    }
  },
  { _id: true }
);

roleSchema.path("technologies").validate(
  (value) => Array.isArray(value) && value.length <= 20,
  "A role can have a maximum of 20 technologies"
);

const experienceSchema = new mongoose.Schema(
  {
    organization: {
      type: String,
      trim: true,
      maxlength: 200,
      required: true
    },
    companyLogo: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    organizationMeta: {
      industry: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
      },
      location: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
      },
      website: {
        type: String,
        trim: true,
        maxlength: 2048,
        default: ""
      }
    },
    roles: {
      type: [roleSchema],
      default: []
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
      max: 500
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    migratedFrom: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

experienceSchema.path("roles").validate(
  (value) => Array.isArray(value) && value.length <= 20,
  "An organization can have a maximum of 20 roles"
);

experienceSchema.index({ isVisible: 1, order: 1 });
experienceSchema.index({ organization: 1 });

const Experience = mongoose.model("Experience", experienceSchema);

export default Experience;
