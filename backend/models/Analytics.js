import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      trim: true,
      maxlength: 500,
      index: true
    },

    ip: {
      type: String,
      trim: true,
      maxlength: 100
    },

    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Unknown",
      index: true
    },

    type: {
      type: String,
      enum: ["visit", "resume"],
      default: "visit",
      index: true
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

/*
 * Analytics dashboards commonly query recent events.
 */
analyticsSchema.index({
  createdAt: -1
});

/*
 * Useful for page-level analytics over time.
 */
analyticsSchema.index({
  page: 1,
  createdAt: -1
});

/*
 * Useful for filtering visit/resume events by time.
 */
analyticsSchema.index({
  type: 1,
  createdAt: -1
});

/*
 * Useful for country-based analytics.
 */
analyticsSchema.index({
  country: 1,
  createdAt: -1
});

const Analytics = mongoose.model(
  "Analytics",
  analyticsSchema
);

export default Analytics;