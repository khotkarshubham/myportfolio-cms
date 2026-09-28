import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["draft", "published"], default: "published" },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 200
    },

    /*
     * Blog content is intentionally stored as HTML because
     * the CMS supports rich-text content.
     *
     * Sanitize this content before saving it in the controller
     * with sanitizeHtml().
     */
    content: {
      type: String,
      required: true,
      maxlength: 50000
    },

    image: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 50
        }
      ],
      default: []
    },

    author: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Shubham Khotkar"
    }
  },
  {
    timestamps: true
  }
);

/*
 * Public blog pages commonly locate articles by slug.
 *
 * `unique: true` already creates a unique index for slug,
 * so we don't create a duplicate slug index here.
 */

/*
 * Useful for blog listing pages.
 */
blogSchema.index({
  createdAt: -1
});

/*
 * Useful when filtering/searching by tags.
 */
blogSchema.index({
  tags: 1
});

const Blog = mongoose.model(
  "Blog",
  blogSchema
);

export default Blog;
