import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { mediaRelativePath, mediaSlug } from "../utils/mediaLayout.js";
import { mediaConfig, mediaKey } from "../services/mediaStorage.js";
import { organizeRecord } from "../scripts/organizeMedia.js";

test("media folders follow content type and slug, with root and legacy prefixes independent", () => {
  const config = mediaConfig({ S3_BUCKET: "test", AWS_REGION: "ap-south-1", S3_PREFIX: "", S3_LEGACY_PREFIX: "portfolio/production" });
  assert.equal(mediaKey("/uploads/images/hero/home-light-mode.webp", config), "images/hero/home-light-mode.webp");
  assert.equal(mediaKey("/uploads/resume/old.pdf", config), "portfolio/production/resume/old.pdf");
  assert.equal(mediaSlug("It's a Cloud Story!"), "its-a-cloud-story");
  const args = { originalname: "Diagram.PNG", slug: "Cloud Project", token: "unique", mimetype: "image/png" };
  assert.equal(mediaRelativePath({ ...args, field: "projectImage" }), "images/project/cloud-project/diagram-unique.png");
  assert.equal(mediaRelativePath({ ...args, field: "blogImage" }), "images/blog/cloud-project/diagram-unique.png");
  assert.equal(mediaRelativePath({ ...args, field: "image" }), "images/profile/profilepic-unique.png");
  assert.equal(mediaRelativePath({ ...args, field: "resume", originalname: "cv.pdf" }), "document/resume/resume-unique.pdf");
  assert.ok(mediaRelativePath({ ...args, field: "certificate", mimetype: "application/pdf", originalname: "cert.pdf" }).startsWith("document/certification/"));
});

test("layout migration verifies before updating, preserves old references on failure and resumes safely", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portfolio-layout-"));
  const env = { ...process.env };
  const settings = { MEDIA_STORAGE: "s3", S3_BUCKET: "test", AWS_REGION: "ap-south-1", S3_PREFIX: "", S3_LEGACY_PREFIX: "portfolio/production", MEDIA_PUBLIC_URL: "" };
  Object.assign(process.env, settings);
  t.after(async () => {
    for (const key of Object.keys(settings)) { if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key]; }
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(path.join(root, "blogs"));
  await writeFile(path.join(root, "blogs", "old.png"), "image data");
  const objects = new Map();
  let invalid = true;
  const send = t.mock.method(S3Client.prototype, "send", async command => {
    const input = command.input;
    if (command.constructor.name === "PutObjectCommand") {
      if (objects.has(input.Key)) throw Object.assign(new Error("Exists"), { $metadata: { httpStatusCode: 412 } });
      objects.set(input.Key, { Metadata: input.Metadata, ContentLength: input.Body.length }); return {};
    }
    if (command.constructor.name === "GetObjectCommand") return { Body: { transformToByteArray: async () => Buffer.from("remote image") } };
    return invalid ? { Metadata: {} } : objects.get(input.Key);
  });
  const record = { _id: "example", slug: "my-article", image: "/uploads/blogs/old.png" };
  let writes = 0;
  const model = { modelName: "Blog", updateOne: async (filter, update) => {
    assert.equal(filter.image, record.image);
    writes++; Object.assign(record, update.$set); return { matchedCount: 1 };
  } };
  const args = { model, record, field: "image", uploadField: "blogImage", root, client: new S3Client({ region: "ap-south-1" }) };
  await organizeRecord({ ...args, apply: false });
  assert.equal(send.mock.calls.length, 0);
  await assert.rejects(organizeRecord({ ...args, apply: true }), /verification failed/);
  assert.equal(writes, 0);
  invalid = false;
  await organizeRecord({ ...args, apply: true });
  assert.match(record.image, /^\/uploads\/images\/blog\/my-article\/old-[a-f0-9]+\.png$/);
  await organizeRecord({ ...args, apply: true });
  assert.equal(writes, 1);
  record.image = "/uploads/blogs/remote.png";
  await organizeRecord({ ...args, apply: true });
  assert.ok(send.mock.calls.some(call => call.arguments[0].input.Key === "portfolio/production/blogs/remote.png"));
  assert.equal(writes, 2);
});
