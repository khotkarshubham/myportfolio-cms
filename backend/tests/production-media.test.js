import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { S3Client } from "@aws-sdk/client-s3";
import { mediaConfig, normalizeMediaPath } from "../services/mediaStorage.js";
import { getUploadPath } from "../middleware/uploadSecurity.js";

test("runtime rejects local storage and filesystem paths", () => {
  assert.throws(() => mediaConfig({ MEDIA_STORAGE: "local" }), /retired/);
  for (const value of ["/etc/passwd", "C:\\uploads\\resume.pdf", "../secret", "/uploads/images/../secret", "/uploads/.env", "/uploads/images/profile/x?y", "/uploads/images/profile/%2e%2e/x"]) {
    assert.equal(getUploadPath(value), "");
  }
  assert.equal(normalizeMediaPath("/uploads/document/resume/resume-a.pdf"), "/uploads/document/resume/resume-a.pdf");
});

test("S3 multipart rollback, committed-save protection, removed hero fields, and concurrency limits", async t => {
  const env = { ...process.env };
  const settings = { MEDIA_STORAGE: "s3", S3_BUCKET: "test", AWS_REGION: "ap-south-1", S3_PREFIX: "" };
  Object.assign(process.env, settings);
  t.after(() => { for (const k of Object.keys(settings)) { if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; } });
  const commands = [];
  let failResume = false, block = false, unblock;
  let pending = new Promise(resolve => { unblock = resolve; });
  t.mock.method(S3Client.prototype, "send", async command => {
    commands.push(command);
    if (command.constructor.name === "PutObjectCommand") {
      assert.ok(Buffer.isBuffer(command.input.Body));
      if (block) await pending;
      if (failResume && command.input.ContentType === "application/pdf") throw new Error("S3 failed");
    }
    return {};
  });
  const { profileUpload } = await import("../middleware/uploadSecurity.js");
  const app = express();
  app.post("/profile", profileUpload, (req, res) => {
    if (req.body.committed) req.mediaCommitted = true;
    res.status(req.body.committed ? 500 : 200).json({ paths: Object.values(req.files).flat().map(file => file.path) });
  });
  app.use((err, req, res, next) => res.status(err.statusCode || (err.name === "MulterError" ? 400 : 500)).json({ error: err.name }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => { unblock(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/profile`;
  const form = (extra = false) => {
    const data = new FormData();
    data.append("image", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "photo.png");
    if (extra) data.append("resume", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "resume.pdf");
    return data;
  };
  failResume = true;
  assert.equal((await fetch(url, { method: "POST", body: form(true) })).status, 500);
  assert.equal(commands.filter(c => c.constructor.name === "DeleteObjectCommand").length, 2);
  failResume = false;
  commands.length = 0;
  const committed = form(); committed.append("committed", "true");
  assert.equal((await fetch(url, { method: "POST", body: committed })).status, 500);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(commands.filter(c => c.constructor.name === "DeleteObjectCommand").length, 0);
  const hero = new FormData(); hero.append("heroLight", new Blob(["RIFF0000WEBP"], { type: "image/webp" }), "hero.webp");
  assert.equal((await fetch(url, { method: "POST", body: hero })).status, 400);
  block = true;
  commands.length = 0;
  const requests = Array.from({ length: 4 }, () => fetch(url, { method: "POST", body: form() }));
  for (let i = 0; i < 100 && commands.length < 4; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(commands.length, 4);
  const limited = await fetch(url, { method: "POST", body: form() });
  assert.equal(limited.status, 503);
  assert.equal(limited.headers.get("retry-after"), "5");
  unblock(); block = false;
  for (const response of await Promise.all(requests)) assert.equal(response.status, 200);
});
