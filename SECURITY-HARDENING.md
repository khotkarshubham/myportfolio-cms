# Security hardening — implementation and deployment status

Local authentication and contact changes are implemented. Frontend CSP preparation is complete, but the Nginx header cannot safely be installed until the active configuration and deployed resource origins are inspected. No production deployment or Nginx reload was performed.

## Files changed

```text
backend/controllers/authController.js
backend/controllers/contactController.js
backend/middleware/authMiddleware.js
backend/middleware/csrfMiddleware.js (new)
backend/middleware/rateLimiters.js
backend/models/Contact.js
backend/package.json
backend/package-lock.json
backend/routes/authRoutes.js
backend/server.js
backend/utils/authCookie.js (new)
backend/tests/accounts-analytics.test.js
backend/tests/admin-enhancements.test.js
backend/tests/security.test.js (new)
frontend/index.html
frontend/public/theme-init.js (new)
frontend/src/components/AdminLayout.jsx
frontend/src/components/ProtectedRoute.jsx
frontend/src/pages/Admin/AdminProjects.jsx
frontend/src/pages/Admin/ChangePassword.jsx
frontend/src/pages/Admin/Login.jsx
frontend/src/services/api.js
SECURITY-HARDENING.md (new)
```

## Authentication

- Existing JWT signing, JWT_SECRET, one-hour expiration and database-backed identity/role/sessionVersion checks remain intact. Bearer headers are no longer authentication credentials.
- Login, password change and session revocation issue the JWT only through Set-Cookie; response bodies no longer contain tokens. Existing success/error envelopes and non-token fields remain.
- Cookie: name `token`, HttpOnly, SameSite=Lax, Path=/api, host-only (no Domain), Max-Age=3600 seconds. Secure is true when the existing NODE_ENV is production; false in development/test for local HTTP. Production must set NODE_ENV=production.
- POST /api/auth/logout clears the cookie using identical options, excluding expiration/maxAge. This removes the browser credential; it does not revoke a separately stolen JWT before its one-hour expiry. Existing session revocation and password-change mechanisms invalidate prior versions.
- Axios uses withCredentials. The frontend no longer decodes or stores JWTs and removes legacy admin_token entries from both browser storage areas on startup. Existing stored tokens do not migrate: administrators sign in again.
- admin_role/admin_email remain presentation-only values. ProtectedRoute refreshes them from /api/auth/me before mounting admin content. Backend authorization always uses MongoDB.
- State-changing /api/auth requests, plus other API writes carrying an authentication cookie, require X-CSRF-Protection: 1. Axios sets it for unsafe methods, including multipart uploads. Origin, when present, must exactly match existing normalized allowedOrigins. CORS permits this header only for the existing frontend allowlist. Cross-site forms cannot supply it; foreign scripted requests require a rejected CORS preflight. SameSite=Lax adds defense in depth and permits navigation from external links. HttpOnly alone does not prevent CSRF.
- API responses explicitly receive Cache-Control: no-store. Helmet is unchanged.

## Contact

- Incoming name/email/message must be strings, nonblank, and no more than 100/254/2000 characters respectively. Oversized original input is rejected with the existing error envelope and HTTP 400 before sanitization/persistence; it is no longer silently truncated.
- Existing control-character cleanup and email format validation remain. Literal user text is preserved. Inbox and dashboard render contact fields using React text interpolation; no contact HTML injection was found.
- Contact schema message maxlength changes from 5000 to 2000. No data migration or index changes; historical longer records remain stored. Updating such historical documents should be verified before deployment if they exist.
- Existing contact-specific limiter now allows five attempts per IP in a one-hour fixed window. Standard headers enabled, legacy headers disabled, existing 429 envelope preserved. Invalid attempts count too.
- Existing trust proxy=1 is retained, not guessed or broadened. Deployment must confirm exactly one trusted proxy, Node cannot be reached directly, and Nginx forwards the actual client address consistently. Active Nginx configuration was absent, so production IP behavior remains unverified.
- Existing Nodemailer notification uses a constant subject/configured addresses and places user text only in the plain-text body. No user fields are concatenated into email headers.
- Existing 10kb JSON/urlencoded body limits remain.

## Dependencies and environment

Added cookie-parser ^1.4.7 and its cookie-signature transitive dependency. No environment variables added. Existing NODE_ENV, FRONTEND_URL/FRONTEND_URL_WWW, JWT_SECRET and VITE_API_URL continue to apply.

## Frontend CSP: candidate, not installed or finalized

The inline theme initializer is now /theme-init.js; built HTML has only same-origin external scripts. Source inspection found Google Fonts CSS/font downloads, GitHub REST fetches, the installed calendar's github-contributions-api.jogruber.de endpoint, same-origin API/uploads, blob image previews, CSS/animation/cropper/chart inline styles and bundled SVGs. No active frontend socket connection, external script SDK, iframe, worker or media element was found. External navigation links do not need connect-src permissions.

Candidate for the known same-origin production setup:

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.github.com https://github-contributions-api.jogruber.de; manifest-src 'self'; media-src 'none'; worker-src 'none'; frame-src 'none'; upgrade-insecure-requests
```

Styles require unsafe-inline because existing React/motion/cropper/chart components use inline styles. Scripts do not require unsafe-inline or unsafe-eval.

Before finalizing, inspect the active `nginx -T` output, production VITE_API_URL origin, and persisted image/certificate/project URLs. assetUrl accepts external HTTP(S) resources from database records; source alone cannot determine their origins. Add only confirmed required HTTPS image hosts to img-src. Verify whether www is redirected to the canonical host; if www serves the app while API/uploads use the apex host, explicit apex connect-src/img-src permissions will be needed. Local HTTP Vite development requires a different policy and should not inherit the production Nginx header.

Deliver CSP through Nginx on SPA HTML responses, including SPA fallback. Do not add it to the API proxy location or overwrite API Helmet CSP. Nginx add_header inheritance can drop parent security headers when a child adds any header: inspect the exact server/location structure and preserve all existing headers in the HTML context. Do not invent a replacement server block.

After the actual configuration is edited, run `sudo nginx -t`, reload only if successful with `sudo systemctl reload nginx`, and verify the HTML/API/dotfile headers and every SPA/admin resource in a browser. Neither command could run in this Windows workspace; no local nginx executable or deployment target was supplied.

## Verification

- Backend npm test: 37/37 passed, including HTTP cookie login/protected access/logout/login again, missing/malformed/expired/wrong-signature credentials, authoritative role rejection, cookie flags, CSRF denial, contact field rejection/preservation and sixth-request/hourly rate limiting. MongoDB operations are mocked; this is not a real database/browser end-to-end test.
- Frontend npm run build: passed; existing large-chunk warning for CountryVisitsMap remains.
- git diff --check: passed.
- Neither package defines a lint command.
- Read-only live curl -I probes: root 200 without CSP; /api/health 200 with Helmet CSP and no-store; /.env and /.git/config both 403; Server: nginx without a version. These describe the existing deployment, not the unshipped local changes.
- Browser DevTools checks (HttpOnly invisibility, storage removal, cookie credentials, full resources) and production authentication/contact behavior remain pending deployment. Existing test fixtures were updated to inspect cookies rather than JWT response bodies.
- A contact test initially attempted the existing mail transport; SMTP rejected authentication and contact persistence still succeeded as designed. The test now mocks the transport to avoid external mail traffic.
- npm audit: nine reported vulnerabilities (two moderate, six high, one critical), including critical proxy-addr and advisories affecting Nodemailer. No broad or breaking dependency upgrade was attempted. Audit findings require separate dependency remediation and applicability review.

## Remaining concerns

CSP header installation/resource inventory, proxy topology validation, browser and real-MongoDB checks, and dependency remediation remain. Rate-limit state uses the existing per-process memory store, resets on restart and is not shared across multiple Node instances. Confirm that matches production. Cookie authentication expects same-site frontend/API deployment; a genuinely cross-site frontend would need a separate cookie/CSRF design review.

References: [OWASP CSRF custom-header guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) and [Express cookie/clearCookie behavior](https://expressjs.com/en/4x/api/response/).
