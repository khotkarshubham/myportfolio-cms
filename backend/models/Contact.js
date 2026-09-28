import mongoose from "mongoose";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactSchema = new mongoose.Schema(
  {
    readAt: { type: Date, default: null },
    archived: { type: Boolean, default: false },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      validate: {
        validator: (value) => EMAIL_REGEX.test(value),
        message: "Please provide a valid email address"
      }
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000
    }
  },
  {
    timestamps: true
  }
);

/*
 * Contact submissions are normally displayed newest-first.
 */
contactSchema.index({
  createdAt: -1
});

const Contact = mongoose.model(
  "Contact",
  contactSchema
);

export default Contact;
