import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { S3Client } from "@aws-sdk/client-s3";
import Profile from "../models/Profile.js";
import { migrateHeroes } from "../scripts/migrateHeroImages.js";

test("hero migration previews, verifies both files before linking, reruns safely and protects existing settings", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "portfolio-heroes-"));
  const uploadDir = path.join(root, "uploads");
  const saved = { ...process.env };
  const settings = { S3_BUCKET: "test-bucket", AWS_REGION: "ap-south-1", S3_PREFIX: "portfolio/test", MEDIA_STORAGE: "s3", MEDIA_PUBLIC_URL: "" };
  Object.assign(process.env, settings);
  t.after(async () => {
    for (const key of Object.keys(settings)) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
    await rm(root, { recursive: true, force: true });
  });
  const body = Buffer.from("RIFF0000WEBPtest");
  for (const theme of ["light", "dark"]) await writeFile(path.join(root, `home-${theme}-mode.webp`), body);
  const profile = { _id: "507f1f77bcf86cd799439011", heroLight: "", heroDark: "" };
  const lookup = t.mock.method(Profile, "findOne", () => ({ lean: async () => ({ ...profile }) }));
  const objects = new Map();
  let failDark = true;
  let matchedCount = 1;
  const update = t.mock.method(Profile, "updateOne", async (filter, changes) => {
    assert.equal(objects.size, 2);
    assert.equal(filter.heroLight, profile.heroLight);
    if (matchedCount) Object.assign(profile, changes.$set);
    return { matchedCount };
  });
  const send = t.mock.method(S3Client.prototype, "send", async command => {
    const input = command.input;
    if (failDark && input.Key.includes("home-dark-mode")) throw new Error("Simulated S3 failure");
    if (command.constructor.name === "PutObjectCommand") {
      assert.equal(input.IfNoneMatch, "*");
      if (objects.has(input.Key)) throw Object.assign(new Error("Exists"), { $metadata: { httpStatusCode: 412 } });
      objects.set(input.Key, { Metadata: input.Metadata, ContentLength: input.Body.length });
      return {};
    }
    return objects.get(input.Key);
  });
  await migrateHeroes({ sourceDir: root, uploadDir });
  assert.equal(send.mock.calls.length, 0);
  assert.equal(lookup.mock.calls.length, 0);
  await assert.rejects(migrateHeroes({ sourceDir: root, uploadDir, apply: true }), /Simulated/);
  assert.equal(update.mock.calls.length, 0);
  failDark = false;
  await migrateHeroes({ sourceDir: root, uploadDir, apply: true });
  assert.equal(profile.heroLight, "/uploads/images/hero/home-light-mode.webp");
  assert.equal(profile.heroDark, "/uploads/images/hero/home-dark-mode.webp");
  await assert.rejects(readFile(path.join(uploadDir, "images/hero/home-light-mode.webp")), { code: "ENOENT" });
  await migrateHeroes({ sourceDir: root, uploadDir, apply: true });
  assert.equal(objects.size, 2);
  matchedCount = 0;
  await assert.rejects(migrateHeroes({ sourceDir: root, uploadDir, apply: true }), /Profile changed/);
  objects.get("portfolio/test/images/hero/home-dark-mode.webp").Metadata.sha256 = "mismatch";
  const callsBefore = update.mock.calls.length;
  await assert.rejects(migrateHeroes({ sourceDir: root, uploadDir, apply: true }), /verification failed/);
  assert.equal(update.mock.calls.length, callsBefore);
  profile.heroLight = "/uploads/hero/light/other.webp";
  await assert.rejects(migrateHeroes({ sourceDir: root, uploadDir, apply: true }), /different image/);
});
