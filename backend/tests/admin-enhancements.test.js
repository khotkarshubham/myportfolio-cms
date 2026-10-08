import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import ActivityLog from "../models/ActivityLog.js";
import Analytics from "../models/Analytics.js";
import {
  loginAdmin,
  changePassword,
  revokeOtherSessions,
} from "../controllers/authController.js";
import {
  getAdmins,
  updateAdmin,
} from "../controllers/adminManagementController.js";
import { getAnalytics } from "../controllers/analyticsController.js";
import { analyticsWindow } from "../utils/analyticsWindow.js";
const id = "507f1f77bcf86cd799439011";
const actor = {
  id,
  role: "superadmin",
  email: "owner@example.com",
  sessionVersion: 3,
};
const response = () => ({
  code: 200, cookie(name, token, options) { this.authToken = token; this.cookieOptions = options; return this; },
  status(code) {
    this.code = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
const account = {
  _id: id,
  email: actor.email,
  role: "superadmin",
  password: "test-hash",
  isActive: true,
  sessionVersion: 3,
};
function secret(t) {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "unit-test-only-secret-for-session-validation";
  t.after(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });
}

test("existing shorter passwords can authenticate while new password policy stays enforced", async (t) => {
  secret(t);
  t.mock.method(Admin, "findOne", async () => account);
  t.mock.method(Admin, "updateOne", async () => ({}));
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(ActivityLog, "create", async () => ({}));
  const res = response();
  await loginAdmin(
    { body: { email: actor.email, password: "legacy123" } },
    res,
  );
  assert.equal(res.code, 200);
  assert.ok(res.authToken);
  assert.equal(res.body.data.token, undefined);
  const invalid = response();
  await changePassword(
    { user: actor, body: { oldPassword: "legacy123", newPassword: "short" } },
    invalid,
  );
  assert.equal(invalid.code, 400);
});
test("revoking sessions verifies password and sets a new cookie with incremented version", async (t) => {
  secret(t);
  let filter, changes;
  t.mock.method(Admin, "findById", async () => account);
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(ActivityLog, "create", async () => ({}));
  t.mock.method(Admin, "findOneAndUpdate", async (f, c) => {
    filter = f;
    changes = c;
    return { ...account, sessionVersion: 4 };
  });
  const res = response();
  await revokeOtherSessions(
    { user: actor, body: { currentPassword: "valid-current-password" } },
    res,
  );
  assert.equal(res.code, 200);
  assert.deepEqual(filter.$or, [{ sessionVersion: 3 }]);
  assert.equal(changes.$inc.sessionVersion, 1);
  assert.equal(
    jwt.verify(res.authToken, process.env.JWT_SECRET).sessionVersion,
    4,
  );
  assert.ok(!JSON.stringify(res.body).includes("test-hash"));
});
test("wrong passwords and stale sessions cannot revoke another session", async (t) => {
  t.mock.method(Admin, "findById", async () => account);
  const compare = t.mock.method(bcrypt, "compare", async () => false);
  const update = t.mock.method(Admin, "findOneAndUpdate", async () => null);
  let res = response();
  await revokeOtherSessions(
    { user: actor, body: { currentPassword: "wrong" } },
    res,
  );
  assert.equal(res.code, 400);
  assert.equal(update.mock.calls.length, 0);
  compare.mock.mockImplementation(async () => true);
  res = response();
  await revokeOtherSessions(
    { user: actor, body: { currentPassword: "correct" } },
    res,
  );
  assert.equal(res.code, 409);
});
test("password changes include authenticated session version in atomic write", async (t) => {
  let filter;
  t.mock.method(Admin, "findById", async () => account);
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(bcrypt, "hash", async () => "new-hash");
  t.mock.method(Admin, "findOneAndUpdate", async (value) => {
    filter = value;
    return null;
  });
  const res = response();
  await changePassword(
    {
      user: actor,
      body: {
        oldPassword: "current-password",
        newPassword: "different-password",
      },
    },
    res,
  );
  assert.equal(res.code, 409);
  assert.deepEqual(filter.$or, [{ sessionVersion: 3 }]);
});
test("user search filters the database before pagination and returns safe fields and summary", async (t) => {
  let filter, fields, skip, limit;
  const query = {
    select(value) {
      fields = value;
      return this;
    },
    sort() {
      return this;
    },
    skip(value) {
      skip = value;
      return this;
    },
    limit(value) {
      limit = value;
      return this;
    },
    lean: async () => [],
  };
  t.mock.method(Admin, "find", (value) => {
    filter = value;
    return query;
  });
  t.mock.method(Admin, "countDocuments", async () => 23);
  const res = response();
  await getAdmins(
    {
      user: actor,
      query: { page: "2", search: "a+b", role: "editor", status: "active" },
    },
    res,
  );
  assert.equal(res.code, 200);
  assert.equal(skip, 10);
  assert.equal(limit, 10);
  assert.equal(filter.role, "editor");
  assert.equal(filter.isActive, true);
  assert.equal(filter.$or[0].name.$regex, "a\\+b");
  assert.equal(res.body.data.total, 23);
  assert.equal(res.body.data.summary.members, 23);
  assert.ok(!fields.split(" ").includes("password"));
});
test("display-name-only changes do not unnecessarily invalidate sessions", async (t) => {
  let changes;
  t.mock.method(Admin, "findById", async () => account);
  t.mock.method(Admin, "findOneAndUpdate", (_, value) => {
    changes = value;
    return { select: async () => ({ _id: id, name: "Updated name" }) };
  });
  t.mock.method(ActivityLog, "create", async () => ({}));
  const res = response();
  await updateAdmin(
    { user: actor, params: { id }, body: { name: "Updated name" } },
    res,
  );
  assert.equal(res.code, 200);
  assert.equal(changes.$set.name, "Updated name");
  assert.equal(changes.$inc, undefined);
});
test("custom analytics dates are inclusive, bounded, calendar-valid and compared with the preceding period", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  const period = analyticsWindow("custom", now, {
    from: "2026-09-01",
    to: "2026-09-07",
  });
  assert.equal(period.days, 7);
  assert.equal(period.end.toISOString(), "2026-09-07T23:59:59.999Z");
  assert.equal(period.previousEnd.toISOString(), "2026-08-31T23:59:59.999Z");
  assert.equal(
    analyticsWindow("custom", now, {
      from: "2026-09-29",
      to: "2026-09-29",
    }).end.toISOString(),
    now.toISOString(),
  );
  for (const dates of [
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2024-01-01", to: "2026-01-01" },
    { from: "2026-09-30", to: "2026-09-30" },
    { from: "2026-09-07", to: "2026-09-01" },
  ])
    assert.throws(() => analyticsWindow("custom", now, dates));
});
test("historical analytics keep active visitors live and expose daily visitor aggregation without raw IDs", async (t) => {
  const pipelines = [];
  t.mock.method(Analytics, "countDocuments", async () => 0);
  t.mock.method(Analytics, "aggregate", async (p) => {
    pipelines.push(p);
    return [];
  });
  const res = response();
  await getAnalytics(
    { query: { range: "custom", from: "2020-01-01", to: "2020-01-02" } },
    res,
  );
  assert.equal(res.code, 200);
  assert.equal(res.body.chart.length, 2);
  assert.equal(res.body.chart[0].visitors, 0);
  assert.equal(res.body.period.to, "2020-01-02T23:59:59.999Z");
  assert.ok(new Date(res.body.generatedAt) > new Date("2020-01-02"));
  assert.ok(
    pipelines.some(
      (p) => p[0].$match.createdAt?.$gte > new Date(Date.now() - 6 * 60000),
    ),
  );
  const daily = pipelines.find((p) =>
    p.some((stage) => stage.$project?.visitors),
  );
  assert.ok(daily);
  assert.equal(
    daily.find((stage) => stage.$project).$project.visitorIds,
    undefined,
  );
});
