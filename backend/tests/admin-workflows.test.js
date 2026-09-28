import test from "node:test";
import assert from "node:assert/strict";
import { validateHttpUrl, validateWhatsapp } from "../utils/profileLinks.js";
import Profile from "../models/Profile.js";
import Contact from "../models/Contact.js";
import Blog from "../models/Blog.js";
import ActivityLog from "../models/ActivityLog.js";
import { updateProfile } from "../controllers/profileController.js";
import { updateContact } from "../controllers/contactController.js";
import {
  createBlog,
  updateBlog,
  getBlogs,
  getBlogBySlug,
} from "../controllers/blogController.js";
import logRoutes from "../routes/activityLogRoutes.js";
const response = () => ({
  code: 200,
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
const id = "507f1f77bcf86cd799439011";

test("profile links normalize optional protocols and reject unsafe schemes", () => {
  assert.equal(
    validateHttpUrl(" github.com/example "),
    "https://github.com/example",
  );
  assert.equal(validateHttpUrl(""), "");
  for (const value of [
    "javascript:alert(1)",
    "ftp://example.com",
    "https://user:pass@example.com",
    "not a url",
  ])
    assert.equal(validateHttpUrl(value), "");
});
test("WhatsApp phone numbers and supported links normalize to schema-safe digits", () => {
  for (const value of [
    "+91 (98765) 43210",
    "wa.me/919876543210",
    "https://api.whatsapp.com/send?phone=%2B919876543210&text=hello",
    "https://web.whatsapp.com/send?phone=919876543210",
  ])
    assert.equal(validateWhatsapp(value), "919876543210");
  for (const value of [
    "https://example.com/919876543210",
    "https://wa.me/",
    "123",
    "+0123456789",
    "https://wa.me.evil.com/919876543210",
  ])
    assert.equal(validateWhatsapp(value), null);
  assert.equal(validateWhatsapp(""), "");
});
test("profile update persists normalized links, preserves omitted fields and supports clearing", async (t) => {
  const profile = new Profile({
    _id: id,
    name: "Test owner",
    title: "Engineer",
    instagram: "https://instagram.com/original",
  });
  let saved = 0;
  profile.save = async () => {
    await profile.validate();
    saved++;
  };
  t.mock.method(Profile, "findOne", async () => profile);
  t.mock.method(ActivityLog, "create", async () => ({}));
  let res = response();
  await updateProfile(
    {
      body: {
        github: "github.com/updated",
        whatsapp:
          "https://api.whatsapp.com/send?phone=919876543210&text=long-message",
      },
    },
    res,
  );
  assert.equal(res.code, 200);
  assert.equal(saved, 1);
  assert.equal(profile.github, "https://github.com/updated");
  assert.equal(profile.whatsapp, "919876543210");
  assert.equal(profile.instagram, "https://instagram.com/original");
  res = response();
  await updateProfile({ body: { github: "", whatsapp: "" } }, res);
  assert.equal(res.code, 200);
  assert.equal(profile.github, "");
  assert.equal(profile.whatsapp, "");
});
test("inbox read/archive state persists and can be reversed; invalid IDs are rejected", async (t) => {
  let stored = { _id: id, readAt: null, archived: false };
  t.mock.method(
    Contact,
    "findByIdAndUpdate",
    async (_, updates) => (stored = { ...stored, ...updates }),
  );
  const audit = t.mock.method(ActivityLog, "create", async () => ({}));
  let res = response();
  await updateContact(
    { params: { id }, body: { read: true, archived: true } },
    res,
  );
  assert.equal(res.code, 200);
  assert.ok(stored.readAt instanceof Date);
  assert.equal(stored.archived, true);
  res = response();
  await updateContact(
    { params: { id }, body: { read: false, archived: false } },
    res,
  );
  assert.equal(stored.readAt, null);
  assert.equal(stored.archived, false);
  assert.equal(audit.mock.calls.length, 2);
  res = response();
  await updateContact({ params: { id: "bad" }, body: { read: true } }, res);
  assert.equal(res.code, 400);
  res = response();
  await updateContact({ params: { id }, body: { read: "true" } }, res);
  assert.equal(res.code, 400);
});
test("draft creation and publication update retain sanitized content", async (t) => {
  t.mock.method(ActivityLog, "create", async () => ({}));
  t.mock.method(Blog, "findOne", () => ({
    select: () => ({ lean: async () => null }),
  }));
  t.mock.method(Blog, "create", async (data) => ({ _id: id, ...data }));
  let res = response();
  await createBlog(
    {
      body: {
        title: "An article",
        content: "<p>Hello</p><script>alert(1)</script>",
        status: "draft",
      },
    },
    res,
  );
  assert.equal(res.code, 201);
  assert.equal(res.body.data.status, "draft");
  assert.equal(res.body.data.content, "<p>Hello</p>");
  t.mock.method(Blog, "findById", async () => res.body.data);
  t.mock.method(Blog, "findByIdAndUpdate", async (_, updates) => ({
    _id: id,
    ...updates,
  }));
  const published = response();
  await updateBlog(
    { params: { id }, body: { status: "published", title: "A changed title" } },
    published,
  );
  assert.equal(published.code, 200);
  assert.equal(published.body.data.status, "published");
  assert.equal(published.body.data.slug, "an-article");
});
test("public blog listing and direct slug lookup exclude drafts", async (t) => {
  let listingFilter, detailFilter;
  t.mock.method(Blog, "find", (filter) => {
    listingFilter = filter;
    return { sort: () => ({ lean: async () => [] }) };
  });
  t.mock.method(Blog, "findOne", (filter) => {
    detailFilter = filter;
    return { lean: async () => null };
  });
  await getBlogs({}, response());
  const res = response();
  await getBlogBySlug({ params: { slug: "draft" } }, res);
  assert.deepEqual(listingFilter.status, { $ne: "draft" });
  assert.deepEqual(detailFilter.status, { $ne: "draft" });
  assert.equal(res.code, 404);
});
test("audit history filters before pagination, escapes search and preserves supplied date boundaries", async (t) => {
  let filter, offset, limit;
  const query = {
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    skip(value) {
      offset = value;
      return this;
    },
    limit(value) {
      limit = value;
      return this;
    },
    lean: async () => [],
  };
  t.mock.method(ActivityLog, "find", (value) => {
    filter = value;
    return query;
  });
  t.mock.method(ActivityLog, "countDocuments", async () => 61);
  const handler = logRoutes.stack
    .find((layer) => layer.route?.path === "/logs")
    .route.stack.at(-1).handle;
  const res = response();
  await handler(
    {
      query: {
        page: "2",
        search: "a.b+test",
        category: "inbox",
        from: "2026-09-28T18:30:00.000Z",
        to: "2026-09-29T18:30:00.000Z",
      },
    },
    res,
  );
  assert.equal(res.code, 200);
  assert.equal(offset, 25);
  assert.equal(limit, 25);
  assert.equal(res.body.data.total, 61);
  assert.equal(filter.$or[0].email.$regex, "a\\.b\\+test");
  assert.equal(filter.action.$regex, "CONTACT");
  assert.equal(filter.createdAt.$gte.toISOString(), "2026-09-28T18:30:00.000Z");
});
