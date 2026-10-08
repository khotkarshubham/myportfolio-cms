import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import Admin from '../models/Admin.js';
import ActivityLog from '../models/ActivityLog.js';
import Contact from '../models/Contact.js';
import authRoutes from '../routes/authRoutes.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { csrfProtection } from '../middleware/csrfMiddleware.js';
import { contactLimiter } from '../middleware/rateLimiters.js';
import { createContact } from '../controllers/contactController.js';

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const origin = 'https://khotkarshubham.in';
const secret = 'test-security-only-secret-abcdefghijklmnopqrstuvwxyz';

test('cookie login, protected access, logout and login again; rejects bad tokens and roles', async t => {
  const previous = { secret: process.env.JWT_SECRET, env: process.env.NODE_ENV };
  process.env.JWT_SECRET = secret; process.env.NODE_ENV = 'production';
  t.after(() => {
    for (const [key, value] of [['JWT_SECRET', previous.secret], ['NODE_ENV', previous.env]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const admin = { _id: '507f1f77bcf86cd799439011', email: 'owner@example.com', role: 'superadmin', isActive: true, sessionVersion: 0, password: 'hash' };
  t.mock.method(Admin, 'findOne', async () => admin);
  t.mock.method(Admin, 'updateOne', async () => ({}));
  t.mock.method(Admin, 'findById', () => ({ select: () => ({ lean: async () => admin }) }));
  t.mock.method(bcrypt, 'compare', async () => true);
  t.mock.method(ActivityLog, 'create', async () => ({}));
  const app = express(); app.use(cookieParser(), csrfProtection([origin]), express.json());
  app.use('/api/auth', authRoutes);
  app.get('/private', authMiddleware, allowRoles('superadmin'), (req, res) => res.json({ role: req.user.role }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = () => fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-CSRF-Protection': '1' }, body: JSON.stringify({ email: admin.email, password: 'legacy123' }) });
  let res = await login(); assert.equal(res.status, 200);
  const header = res.headers.get('set-cookie');
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/api', 'Max-Age=3600']) assert.ok(header.includes(flag));
  assert.equal((await res.json()).data.token, undefined);
  const cookie = header.split(';')[0];
  res = await fetch(base + '/private', { headers: { Cookie: cookie } }); assert.equal(res.status, 200);
  for (const token of [null, 'bad', jwt.sign({ id: admin._id }, secret, { expiresIn: -1 }), jwt.sign({ id: admin._id }, 'wrong')]) {
    res = await fetch(base + '/private', { headers: token ? { Cookie: `token=${token}` } : {} }); assert.equal(res.status, 401);
  }
  admin.role = 'viewer'; res = await fetch(base + '/private', { headers: { Cookie: cookie } }); assert.equal(res.status, 403); admin.role = 'superadmin';
  res = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: origin } }); assert.equal(res.status, 403);
  res = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'X-CSRF-Protection': '1' } });
  assert.equal(res.status, 200); assert.match(res.headers.get('set-cookie'), /token=;/); assert.match(res.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  res = await login(); assert.equal(res.status, 200);
});

test('CSRF rejects cross-origin and missing header, allows configured origin and safe methods', () => {
  for (const [method, headers, expected] of [['POST', {}, false], ['POST', { 'X-CSRF-Protection': '1', Origin: 'https://evil.example' }, false], ['POST', { 'X-CSRF-Protection': '1', Origin: origin }, true], ['GET', {}, true]]) {
    let next = false; const res = response();
    csrfProtection([origin])({ method, get: name => headers[name] }, res, () => { next = true; });
    assert.equal(next, expected); if (!expected) assert.equal(res.code, 403);
  }
});

test('contact validates strings and lengths before persistence and preserves literal text', async t => {
  t.mock.method(nodemailer, 'createTransport', () => ({ sendMail: async () => ({}) }));
  let stored; const create = t.mock.method(Contact, 'create', async data => { stored = data; return data; });
  const valid = { name: 'Visitor', email: 'visitor@example.com', message: '<img src=x onerror=alert(1)> hello <3' };
  for (const patch of [{ name: '' }, { name: [] }, { name: 'a'.repeat(101) }, { email: 'bad' }, { email: 'a'.repeat(255) }, { message: ' ' }, { message: 'a'.repeat(2001) }, { message: {} }]) {
    const res = response(); await createContact({ body: { ...valid, ...patch } }, res); assert.equal(res.code, 400);
  }
  assert.equal(create.mock.calls.length, 0);
  const res = response(); await createContact({ body: valid }, res); assert.equal(res.code, 200); assert.equal(stored.message, valid.message);
  assert.equal(Contact.schema.path('message').options.maxlength, 2000);
});

test('contact limits the sixth request and uses a one-hour window', async t => {
  const app = express(); app.post('/api/contact', contactLimiter, (req, res) => res.json({ success: true }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/contact`;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { method: 'POST' }); assert.equal(res.status, i < 5 ? 200 : 429);
    assert.match(res.headers.get('ratelimit-policy'), /5;w=3600/);
  }
});
