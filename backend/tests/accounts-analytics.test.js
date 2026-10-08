import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import Analytics from '../models/Analytics.js';
import ActivityLog from '../models/ActivityLog.js';
import { changePassword } from '../controllers/authController.js';
import { createAdmin, updateAdmin, deleteAdmin } from '../controllers/adminManagementController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { getAnalytics } from '../controllers/analyticsController.js';
import { analyticsWindow, fillAnalyticsDays, normalizePublicPage } from '../utils/analyticsWindow.js';
import { validPassword } from '../utils/passwordPolicy.js';
const id = '507f1f77bcf86cd799439011', targetId = '507f1f77bcf86cd799439012';
const actor = { id, role: 'superadmin', email: 'owner@example.com' };
const response = () => ({ code: 200, cookie(name, token, options) { this.authToken = token; this.cookieOptions = options; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const secret = 'test-only-secret-not-a-deployment-key-123456';
function setSecret(t) { const old = process.env.JWT_SECRET; process.env.JWT_SECRET = secret; t.after(() => { if (old === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = old; }); }

test('password policy enforces bcrypt byte limit, including multibyte passwords', () => {
  assert.equal(validPassword('a'.repeat(12)), true);
  assert.equal(validPassword('a'.repeat(72)), true);
  assert.equal(validPassword('a'.repeat(73)), false);
  assert.equal(validPassword('🔐'.repeat(19)), false);
  assert.equal(validPassword(['password123456']), false);
});
test('incorrect current password returns a form error, without invalidating the session', async t => {
  t.mock.method(Admin, 'findById', async () => ({ _id: id, isActive: true, password: 'oldhash' }));
  t.mock.method(bcrypt, 'compare', async () => false);
  t.mock.method(ActivityLog, 'create', async () => ({}));
  const update = t.mock.method(Admin, 'findOneAndUpdate', async () => ({}));
  const res = response(); await changePassword({ user: actor, body: { oldPassword: 'wrong-password', newPassword: 'a-new-passphrase' } }, res);
  assert.equal(res.code, 400); assert.match(res.body.message, /incorrect/); assert.equal(update.mock.calls.length, 0);
});
test('password change uses conditional update, rotates sessions and sets a replacement cookie', async t => {
  setSecret(t); let mutation, condition;
  t.mock.method(Admin, 'findById', async () => ({ _id: id, email: actor.email, isActive: true, password: 'oldhash' }));
  t.mock.method(bcrypt, 'compare', async () => true);
  t.mock.method(bcrypt, 'hash', async () => 'newhash');
  t.mock.method(ActivityLog, 'create', async () => ({}));
  t.mock.method(Admin, 'findOneAndUpdate', async (filter, changes) => { condition = filter; mutation = changes; return { _id: id, email: actor.email, role: 'superadmin', sessionVersion: 1 }; });
  const res = response(); await changePassword({ user: actor, body: { oldPassword: 'old-passphrase', newPassword: 'new-passphrase' } }, res);
  assert.equal(res.code, 200); assert.equal(condition.password, 'oldhash'); assert.equal(mutation.$inc.sessionVersion, 1); assert.equal(mutation.$set.password, 'newhash');
  assert.equal(jwt.verify(res.authToken, secret).sessionVersion, 1);
  assert.ok(!JSON.stringify(res.body).includes('newhash'));
});
test('authentication rejects pre-change tokens and accepts a fresh token', async t => {
  setSecret(t);
  t.mock.method(Admin, 'findById', () => ({ select: () => ({ lean: async () => ({ _id: id, email: actor.email, isActive: true, role: 'superadmin', sessionVersion: 2 }) }) }));
  let continued = false;
  const old = jwt.sign({ id, sessionVersion: 1 }, secret), fresh = jwt.sign({ id, sessionVersion: 2 }, secret);
  let res = response(); await authMiddleware({ cookies: { token: old } }, res, () => { continued = true; });
  assert.equal(res.code, 401); assert.equal(continued, false);
  res = response(); await authMiddleware({ cookies: { token: fresh } }, res, () => { continued = true; }); assert.equal(continued, true);
});
test('user creation rejects invalid roles and overlong passwords before hashing', async t => {
  const hash = t.mock.method(bcrypt, 'hash', async () => 'hash');
  for (const body of [{ email: 'new@example.com', password: 'a'.repeat(73), role: 'viewer' }, { email: 'new@example.com', password: 'a'.repeat(12), role: 'invalid' }]) {
    const res = response(); await createAdmin({ user: actor, body }, res); assert.equal(res.code, 400);
  }
  assert.equal(hash.mock.calls.length, 0);
});
test('duplicate user races return conflict rather than generic server error', async t => {
  t.mock.method(Admin, 'findOne', async () => null);
  t.mock.method(bcrypt, 'hash', async () => 'hash');
  t.mock.method(Admin, 'create', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  const res = response(); await createAdmin({ user: actor, body: { email: 'new@example.com', password: 'a'.repeat(12), role: 'viewer' } }, res); assert.equal(res.code, 409);
});
test('user management rejects malformed IDs, invalid fields and self-deactivation', async t => {
  t.mock.method(Admin, 'findById', async () => ({ _id: id, role: 'superadmin', isActive: true }));
  for (const [params, body] of [[{ id: 'bad' }, { role: 'editor' }], [{ id }, { role: 'invalid' }], [{ id }, { isActive: 'false' }], [{ id }, {}], [{ id }, { isActive: false }], [{ id }, { role: 'viewer' }]]) {
    const res = response(); await updateAdmin({ user: actor, params, body }, res); assert.equal(res.code, 400);
  }
  const res = response(); await deleteAdmin({ user: actor, params: { id } }, res); assert.equal(res.code, 400);
});
test('role/status updates revoke sessions and audit the acting administrator', async t => {
  let changes, audit;
  t.mock.method(Admin, 'findById', async () => ({ _id: targetId, role: 'editor', isActive: true }));
  t.mock.method(Admin, 'findOneAndUpdate', (_, value) => { changes = value; return { select: async () => ({ _id: targetId, email: 'member@example.com', role: 'viewer', isActive: true }) }; });
  t.mock.method(ActivityLog, 'create', async value => { audit = value; });
  const res = response(); await updateAdmin({ user: actor, params: { id: targetId }, body: { role: 'viewer' } }, res);
  assert.equal(res.code, 200); assert.equal(changes.$inc.sessionVersion, 1); assert.equal(audit.email, actor.email); assert.equal(audit.entityId, targetId);
});
test('analytics daily data crosses month/year boundaries in chronological order and fills zero days', () => {
  const { start, days } = analyticsWindow('7', new Date('2026-01-03T12:00:00Z'));
  const rows = fillAnalyticsDays([{ _id: '2026-01-01', visits: 3, resumeClicks: 1 }], start, days);
  assert.equal(rows.length, 7); assert.equal(rows[0]._id, '2025-12-28'); assert.equal(rows.at(-1)._id, '2026-01-03'); assert.equal(rows[0].visits, 0); assert.equal(rows[4].visits, 3);
  assert.throws(() => analyticsWindow('365'));
});
test('tracking removes query strings and excludes encoded or normalized admin paths', () => {
  assert.equal(normalizePublicPage('/blog/story?source=mail#content'), '/blog/story');
  for (const path of ['/admin?test=1', '/%61dmin/profile', '/blog/../admin', '//evil.example', '/admin/profile', 'https://example.com']) assert.equal(normalizePublicPage(path), null);
});
test('analytics uses the selected period for counts and rankings, and separates recent activity', async t => {
  const filters = [], pipelines = [];
  t.mock.method(Analytics, 'countDocuments', async filter => { filters.push(filter); return 6; });
  t.mock.method(Analytics, 'aggregate', async pipeline => { pipelines.push(pipeline); return pipeline.at(-1).$count ? [{ count: 2 }] : []; });
  const res = response(); await getAnalytics({ query: { range: '7' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.chart.length, 7); assert.equal(res.body.uniqueVisitors, 2); assert.equal(res.body.activeVisitors, 2); assert.equal(res.body.range, '7');
  assert.ok(filters.every(filter => filter.createdAt.$gte instanceof Date));
  const rankings = pipelines.filter(p => p.some(stage => stage.$group?._id?.$ifNull)); assert.equal(rankings.length, 2); assert.ok(rankings.every(p => p[0].$match.createdAt.$gte instanceof Date));
  const countries = rankings.find(p => p[1].$group._id.$ifNull[0] === "$country");
  assert.ok(!countries.some(stage => stage.$limit), "map receives all countries");
  assert.equal(rankings.find(p => p[1].$group._id.$ifNull[0] === "$page").at(-1).$limit, 10);
  const invalid = response(); await getAnalytics({ query: { range: 'invalid' } }, invalid); assert.equal(invalid.code, 400);
});
