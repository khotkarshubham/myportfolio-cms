import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { mediaConfig, mediaKey, mediaRedirect } from "../services/mediaStorage.js";
import Blog from "../models/Blog.js";
import ActivityLog from "../models/ActivityLog.js";

test("media config fails closed and keys reject traversal or external paths", () => {
  assert.throws(() => mediaConfig({ MEDIA_STORAGE: "s3" }), /required/);
  assert.throws(() => mediaConfig({ MEDIA_STORAGE: "typo" }), /Local media storage/);
  assert.throws(() => mediaConfig({ S3_PREFIX: "../escape" }), /Invalid/);
  assert.throws(() => mediaConfig({ S3_BUCKET: "test", AWS_REGION: "ap-south-1", MEDIA_PUBLIC_URL: "http://cdn.example" }), /HTTPS/);
  const config = mediaConfig({ S3_BUCKET: "test", AWS_REGION: "ap-south-1", S3_PREFIX: "portfolio/test" });
  assert.equal(mediaKey("/uploads/blogs/2026/10/example.webp", config), "portfolio/test/blogs/2026/10/example.webp");
  for (const value of ["/uploads/../secret", "/uploads/blogs/%2e%2e/a", "/uploads/blogs/a?b", "https://evil/a", "/uploads/", "/uploads/blogs/\\a"]) assert.equal(mediaKey(value, config), null);
});

test("multipart uploads validate single files, roll back failed saves and route every profile asset to S3", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portfolio-media-test-"));
  const original = { ...process.env };
  Object.assign(process.env, { UPLOAD_DIR: root, MEDIA_STORAGE: "s3", AWS_REGION: "ap-south-1", S3_BUCKET: "test-bucket", S3_PREFIX: "portfolio/test", MEDIA_PUBLIC_URL: "https://cdn.example" });
  t.after(async () => {
    for (const key of ["UPLOAD_DIR", "MEDIA_STORAGE", "AWS_REGION", "S3_BUCKET", "S3_PREFIX", "MEDIA_PUBLIC_URL"]) {
      if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
    }
    await rm(root, { recursive: true, force: true });
  });
  const commands = [];
  let failPut = false;
  t.mock.method(S3Client.prototype, "send", async command => {
    commands.push(command);
    if (failPut && command.constructor.name === "PutObjectCommand") throw new Error("S3 unavailable");
    return {};
  });
  const { blogUpload, profileUpload } = await import("../middleware/uploadSecurity.js");
  const { createBlog, updateBlog } = await import("../controllers/blogController.js");
  const app = express();
  let article;
  t.mock.method(Blog, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
  t.mock.method(Blog, "create", async data => (article = { ...data, _id: "507f1f77bcf86cd799439011" }));
  t.mock.method(Blog, "findById", async () => article);
  t.mock.method(Blog, "findByIdAndUpdate", async (id, updates) => (article = { ...article, ...updates }));
  t.mock.method(ActivityLog, "create", async () => ({}));
  app.post("/articles", blogUpload, createBlog);
  app.put("/articles/:id", blogUpload, updateBlog);
  app.post("/blog", blogUpload, (req, res) => res.status(req.body.fail ? 400 : 201).json({ filename: req.file?.filename }));
  app.post("/profile", profileUpload, (req, res) => res.json({ fields: Object.keys(req.files) }));
  app.use("/uploads", mediaRedirect);
  app.use((err, req, res, next) => res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : err.statusCode || (err.name === "MulterError" ? 400 : 500)).json({ error: err.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
  const upload = async (bytes, type = "image/png", name = "cover.png", fail = false) => {
    const form = new FormData();
    form.append("blogImage", new Blob([bytes], { type }), name);
    form.append("title", "Late title");
    if (fail) form.append("fail", "1");
    return fetch(base + "/blog", { method: "POST", body: form });
  };
  assert.equal((await upload(png)).status, 201);
  const put = commands.find(c => c.constructor.name === "PutObjectCommand").input;
  assert.match(put.Key, /^portfolio\/test\/images\/blog\/late-title\/cover-[\w-]+\.png$/);
  assert.equal(put.ContentType, "image/png");
  assert.equal(put.ACL, undefined);
  assert.equal(put.Metadata.sha256.length, 64);
  assert.equal((await upload(Buffer.from("not an image"))).status, 400);
  assert.equal((await upload(png, "image/jpeg", "wrong.jpg")).status, 400);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  const before = commands.length;
  assert.equal((await upload(png, "image/png", "cover.png", true)).status, 400);
  for (let i = 0; i < 30 && !commands.slice(before).some(c => c.constructor.name === "DeleteObjectCommand"); i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(commands.slice(before).some(c => c.constructor.name === "DeleteObjectCommand"));
  const profile = new FormData();
  for (const field of ["image"]) profile.append(field, new Blob([png], { type: "image/png" }), "asset.png");
  profile.append("resume", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "resume.pdf");
  assert.equal((await fetch(base + "/profile", { method: "POST", body: profile })).status, 200);
  for (const folder of ["images/profile", "document/resume"]) assert.ok(commands.some(c => c.input.Key.includes(`/test/${folder}/`)));
  const form = new FormData();
  form.append("title", "A cover story");
  form.append("content", "<p>Article body</p>");
  form.append("tags", '["Cloud","S3"]');
  form.append("imageAlt", "Architecture diagram");
  form.append("blogImage", new Blob([png], { type: "image/png" }), "cover.png");
  assert.equal((await fetch(base + "/articles", { method: "POST", body: form })).status, 201);
  assert.deepEqual(article.tags, ["Cloud", "S3"]);
  assert.equal(article.imageAlt, "Architecture diagram");
  assert.match(article.image, /^\/uploads\/images\/blog\/a-cover-story\//);
  const replacement = new FormData();
  replacement.append("blogImage", new Blob([png], { type: "image/png" }), "new-cover.png");
  replacement.append("title", "A different title");
  assert.equal((await fetch(base + "/articles/" + article._id, { method: "PUT", body: replacement })).status, 200);
  assert.match(article.image, /^\/uploads\/images\/blog\/a-cover-story\/new-cover-/);
  const oldImage = article.image;
  const remove = new FormData(); remove.append("image", "");
  assert.equal((await fetch(base + "/articles/" + article._id, { method: "PUT", body: remove })).status, 200);
  assert.equal(article.image, "");
  assert.ok(commands.some(c => c.constructor.name === "DeleteObjectCommand" && c.input.Key === mediaKey(oldImage)));
  failPut = true;
  assert.equal((await upload(png)).status, 500);
  const redirect = await fetch(base + "/uploads/blogs/example.png", { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "https://cdn.example/portfolio/test/blogs/example.png");
  async function files(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : [e.name]))).flat();
  }
  assert.deepEqual(await files(root), []);

});
