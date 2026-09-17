import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    /*
     * Keep adminId optional.
     *
     * Login failures can happen before authentication, so
     * there may be no authenticated admin ID available.
     */
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      index: true
    },

    /*
     * Store the email separately so audit history remains
     * useful even after an Admin document is deleted.
     */
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },

    entity: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null
    },

    /*
     * Keep this as String because existing audit records may
     * contain different kinds of entity identifiers.
     */
    entityId: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null
    },

    ip: {
      type: String,
      trim: true,
      maxlength: 100
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

/*
 * Most activity-log screens query recent records.
 *
 * This index makes:
 *
 * ActivityLog.find().sort({ createdAt: -1 })
 *
 * much more efficient as the collection grows.
 */
activityLogSchema.index({
  createdAt: -1
});

/*
 * Useful for filtering audit history by administrator.
 */
activityLogSchema.index({
  adminId: 1,
  createdAt: -1
});

/*
 * Useful for filtering by action, e.g. LOGIN_FAILED,
 * LOGIN_SUCCESS, DELETE_PROJECT, etc.
 */
activityLogSchema.index({
  action: 1,
  createdAt: -1
});

/*
 * Useful for looking up activity belonging to a particular
 * entity.
 */
activityLogSchema.index({
  entity: 1,
  entityId: 1,
  createdAt: -1
});

const ActivityLog = mongoose.model(
  "ActivityLog",
  activityLogSchema
);

export default ActivityLog;
