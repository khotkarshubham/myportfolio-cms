import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Skill from "../models/Skill.js";
import ActivityLog from "../models/ActivityLog.js";
import {
  createSkill,
  updateSkillIcon,
  getSkills,
} from "../controllers/skillController.js";
import { skillIconKeys } from "../utils/skillIconKeys.js";
const id = "507f1f77bcf86cd799439011";
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
test("manual icon allowlist matches every bundled frontend icon", () => {
  const source = fs.readFileSync(
    new URL("../../frontend/src/utils/skillIcons.js", import.meta.url),
    "utf8",
  );
  const keys = [
    ...source.matchAll(/(?:"([^"]+)"|\b([a-z0-9]+)):\s*(?:Si|Fa|Vsc|Fi)\w+/g),
  ].map((m) => m[1] || m[2]);
  assert.deepEqual([...skillIconKeys].sort(), ["", ...keys].sort());
});
test("skill creation persists a manual icon and defaults to automatic", async (t) => {
  const saved = [];
  t.mock.method(Skill, "create", async (value) => {
    saved.push(value);
    return { _id: id, ...value };
  });
  t.mock.method(ActivityLog, "create", async () => ({}));
  for (const body of [
    { name: "Custom cloud", iconKey: "generic-cloud" },
    { name: "Docker" },
  ]) {
    const res = response();
    await createSkill({ body }, res);
    assert.equal(res.code, 201);
  }
  assert.equal(saved[0].iconKey, "generic-cloud");
  assert.equal(saved[1].iconKey, "");
});
test("invalid manual icons and malformed IDs are rejected without database writes", async (t) => {
  const update = t.mock.method(Skill, "findByIdAndUpdate", async () => null);
  const create = t.mock.method(Skill, "create", async () => null);
  for (const iconKey of [
    "https://example.com/icon.svg",
    "__proto__",
    null,
    {},
    "missing",
  ]) {
    const res = response();
    await createSkill({ body: { name: "Custom", iconKey } }, res);
    assert.equal(res.code, 400);
    const patched = response();
    await updateSkillIcon({ params: { id }, body: { iconKey } }, patched);
    assert.equal(patched.code, 400);
  }
  const res = response();
  await updateSkillIcon(
    { params: { id: "bad" }, body: { iconKey: "aws" } },
    res,
  );
  assert.equal(res.code, 400);
  assert.equal(create.mock.calls.length, 0);
  assert.equal(update.mock.calls.length, 0);
});
test("existing skill icon can be changed and reset, with audit logging", async (t) => {
  const updates = [],
    audits = [];
  t.mock.method(Skill, "findByIdAndUpdate", async (_, value, options) => {
    updates.push(value);
    assert.equal(options.runValidators, true);
    return { _id: id, name: "Custom", ...value.$set };
  });
  t.mock.method(ActivityLog, "create", async (value) => {
    audits.push(value);
  });
  for (const iconKey of ["generic-server", ""]) {
    const res = response();
    await updateSkillIcon(
      { params: { id }, body: { iconKey, name: "Must not rename" } },
      res,
    );
    assert.equal(res.code, 200);
    assert.equal(res.body.data.iconKey, iconKey);
  }
  assert.deepEqual(updates, [
    { $set: { iconKey: "generic-server" } },
    { $set: { iconKey: "" } },
  ]);
  assert.equal(audits[0].action, "UPDATE_SKILL_ICON");
});
test("missing skill returns 404 and public listings retain the saved icon", async (t) => {
  t.mock.method(Skill, "findByIdAndUpdate", async () => null);
  const missing = response();
  await updateSkillIcon({ params: { id }, body: { iconKey: "aws" } }, missing);
  assert.equal(missing.code, 404);
  t.mock.method(Skill, "find", () => ({
    sort: () => ({
      lean: async () => [{ _id: id, name: "Custom", iconKey: "aws" }],
    }),
  }));
  const res = response();
  await getSkills({}, res);
  assert.equal(res.body.data[0].iconKey, "aws");
});
