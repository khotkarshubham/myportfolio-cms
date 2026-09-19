import mongoose from "mongoose";

const certificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    /*
     * URL is validated in the controller because this model
     * should not accept dangerous schemes such as javascript:
     * or data:.
     */
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048
    },

    issuer: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ""
    },

    year: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ""
    },

    /*
     * Relative path to an uploaded certification image/file.
     */
    file: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

/*
 * Certification pages are normally displayed newest-first.
 */
certificationSchema.index({
  createdAt: -1
});

const Certification = mongoose.model(
  "Certification",
  certificationSchema
);

export default Certification;