import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import { S3Client } from "@aws-sdk/client-s3";
import Project from "../models/Project.js";
import Admin from "../models/Admin.js";
import ActivityLog from "../models/ActivityLog.js";
import Blog from "../models/Blog.js";
import adminRoutes from "../routes/adminRoutes.js";
import { projectInput, PROJECT_TYPES } from "../utils/projectInput.js";
import { normalizeOrigin, originAllowed } from "../utils/origins.js";
import { getBlogBySlug } from "../controllers/blogController.js";

const id = "507f1f77bcf86cd799439011";
const valid = {
  title: "Cloud platform",
  description: "Highly available infrastructure",
  tech: ["AWS", "Terraform"],
};
test("project fields are bounded, typed, allowlisted, and compatible with old records", () => {
  for (const type of PROJECT_TYPES)
    assert.equal(projectInput({ ...valid, type }).type, type);
  assert.equal(projectInput(valid).status, "completed");
  assert.deepEqual(
    projectInput({ ...valid, tech: '["AWS","AWS"]', isAdmin: true }).tech,
    ["AWS"],
  );
  assert.equal(projectInput({ ...valid, isAdmin: true }).isAdmin, undefined);
  for (const patch of [
    { title: {} },
    { title: "a".repeat(151) },
    { description: [] },
    { type: "$ne" },
    { status: "draft" },
    { outcome: "a".repeat(301) },
    { github: "javascript:alert(1)" },
    { github: "https://github.com.evil.test/x" },
    { demo: "https://user:password@example.com" },
    { tech: '[{"$ne":null}]' },
    { tech: "invalid" },
    { tech: Array(21).fill("AWS") },
  ]) {
    assert.throws(
      () => projectInput({ ...valid, ...patch }),
      (error) => error.statusCode === 400,
    );
  }
  assert.equal(
    projectInput({ title: "Renamed" }, valid).description,
    valid.description,
  );
});

test("origin checks reject untrusted WebSocket origins and insecure production config", () => {
  assert.equal(normalizeOrigin("http://example.com", true), null);
  for (const value of [
    "https://user:pass@example.com",
    "https://example.com/path",
    "javascript:alert(1)",
  ])
    assert.equal(normalizeOrigin(value), null);
  assert.equal(
    normalizeOrigin("https://example.com/", true),
    "https://example.com",
  );
  assert.equal(
    originAllowed("https://evil.example.com", ["https://example.com"]),
    false,
  );
  assert.equal(
    originAllowed("https://example.com", ["https://example.com"]),
    true,
  );
});

test("project API enforces roles and safely creates, replaces, clears and deletes S3 covers", async (t) => {
  const previous = { ...process.env };
  const env = {
    JWT_SECRET: "x".repeat(40),
    AWS_REGION: "ap-south-1",
    S3_BUCKET: "test",
    S3_PREFIX: "",
    MEDIA_STORAGE: "s3",
  };
  Object.assign(process.env, env);
  t.after(() => {
    for (const key of Object.keys(env)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  let role = "editor",
    saved;
  const commands = [];
  t.mock.method(Admin, "findById", () => ({
    select: () => ({
      lean: async () => ({ _id: id, role, isActive: true, sessionVersion: 0 }),
    }),
  }));
  t.mock.method(ActivityLog, "create", async () => ({}));
  t.mock.method(S3Client.prototype, "send", async (command) => {
    commands.push(command);
    return {};
  });
  t.mock.method(
    Project,
    "create",
    async (value) => (saved = { ...value, _id: id }),
  );
  t.mock.method(Project, "findById", async () => (saved ? { ...saved } : null));
  t.mock.method(
    Project,
    "findByIdAndUpdate",
    async (key, update) => (saved = { ...saved, ...update }),
  );
  t.mock.method(Project, "findByIdAndDelete", async () => {
    const value = saved;
    saved = null;
    return value;
  });
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.cookies = { token: req.headers.token };
    next();
  });
  app.use("/admin", adminRoutes);
  app.use((error, req, res, next) =>
    res.status(error.statusCode || 400).json({ message: error.message }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/admin/projects`;
  const token = jwt.sign({ id, sessionVersion: 0 }, env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const json = (method, body, auth = token) => ({
    method,
    headers: { token: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert.equal((await fetch(base, json("POST", valid, "bad"))).status, 401);
  assert.equal(
    (
      await fetch(
        base,
        json(
          "POST",
          valid,
          jwt.sign({ id }, env.JWT_SECRET, { algorithm: "HS384" }),
        ),
      )
    ).status,
    401,
  );
  role = "viewer";
  assert.equal((await fetch(base, json("POST", valid))).status, 403);
  assert.equal(commands.length, 0);
  role = "editor";
  assert.equal(
    (await fetch(base, json("POST", { ...valid, type: {} }))).status,
    400,
  );
  assert.equal(
    (await fetch(base, json("POST", { ...valid, type: "cloud" }))).status,
    201,
  );
  assert.equal(saved.image, "");
  const form = new FormData();
  form.append(
    "projectImage",
    new Blob([Buffer.from("89504e470d0a1a0a00000000", "hex")], {
      type: "image/png",
    }),
    "architecture.png",
  );
  form.append("title", "New title");
  let res = await fetch(`${base}/${id}`, {
    method: "PUT",
    headers: { token },
    body: form,
  });
  assert.equal(res.status, 200);
  const uploaded = saved.image;
  assert.match(
    uploaded,
    /^\/uploads\/images\/project\/cloud-platform\/architecture-/,
  );
  assert.equal(
    (
      await fetch(
        `${base}/${id}`,
        json("PUT", { image: "/uploads/images/project/other/shared.png" }),
      )
    ).status,
    400,
  );
  assert.equal(saved.image, uploaded);
  res = await fetch(`${base}/${id}`, json("PUT", { image: "" }));
  assert.equal(res.status, 200);
  assert.equal(saved.image, "");
  assert.ok(
    commands.some(
      (c) =>
        c.constructor.name === "DeleteObjectCommand" &&
        c.input.Key === uploaded.slice(9),
    ),
  );
  assert.equal(
    (await fetch(`${base}/invalid`, { method: "DELETE", headers: { token } }))
      .status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/${id}`, { method: "DELETE", headers: { token } }))
      .status,
    200,
  );
});

test("public article reads sanitize legacy HTML before it reaches the browser", async (t) => {
  t.mock.method(Blog, "findOne", () => ({
    lean: async () => ({
      title: "Legacy",
      content:
        '<p>Safe</p><img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
    }),
  }));
  let body;
  const res = {
    status() {
      return this;
    },
    json(value) {
      body = value;
    },
  };
  await getBlogBySlug({ params: { slug: "legacy" } }, res);
  assert.match(body.data.content, /Safe/);
  assert.doesNotMatch(body.data.content, /script|onerror|javascript:|<img/i);
});
