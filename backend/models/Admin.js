import mongoose from "mongoose";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const adminSchema = new mongoose.Schema(
  {
    sessionVersion: { type: Number, default: 0 },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Admin"
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      validate: {
        validator: (value) => EMAIL_REGEX.test(value),
        message: "Please provide a valid email address"
      }
    },

    /*
     * Passwords are stored as bcrypt hashes.
     *
     * Password hashing remains in the controller, so this
     * model does not accidentally hash an already-hashed
     * password during unrelated saves.
     */
    password: {
      type: String,
      required: true,
      minlength: 60
    },

    role: {
      type: String,
      enum: ["superadmin", "editor", "viewer"],
      default: "viewer",
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    }
  },
  {
    timestamps: true
  }
);

/*
 * Normalize email before validation/storage.
 */
adminSchema.pre("validate", function (next) {
  if (typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }

  if (typeof this.name === "string") {
    this.name = this.name.trim();
  }

  next();
});

/*
 * Never expose password hashes through normal JSON responses.
 */
adminSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
