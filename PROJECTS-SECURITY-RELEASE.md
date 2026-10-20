# Projects and application security release

## Project editor

Projects share one card component across the homepage, public project directory and CMS preview. Types: GitHub repository, website/application, network, infrastructure and cloud. Each supports title, description, status, optional outcome, technology tags, optional links and an optional JPG/PNG/WebP cover (5 MB maximum).

Editors and superadmins can create, edit, replace/remove covers and delete projects. Viewers can browse only; the API independently enforces permissions. Saves appear publicly immediately. Category filters and text search are available publicly. Old records need no migration: they display as completed repositories until reclassified in the editor. Existing covers remain available. Uploads use `images/project/<project-slug>/<unique-filename>` and preserve the existing folder on edits.

## Protections added in this release

- Strict project input types, lengths and enum checks; allowlisted writes; safe HTTP(S) links without credentials; GitHub links restricted to github.com. Shared image references cannot be reassigned between projects.
- JWT verification accepts HS256 only, enforces a one-hour maximum age and validates identity shape before a database lookup. Current database role, active state and session version remain authoritative.
- Both WebSocket handshakes and polling enforce the configured origin allowlist. The public live-user count is informational, not a trusted audit metric; origin checking is not authentication.
- Baseline API limit of 300 requests/minute/IP, with stricter login, password, contact, analytics and media limits retained. These limits are per process; use an edge/shared limiter when running multiple instances.
- Production origins require HTTPS. Node defaults to 127.0.0.1 in production behind the existing one-hop proxy. If running in a container, explicitly configure HOST and enforce network restrictions. Do not expose Node directly to the internet.
- MongoDB must connect before the server listens; bounded connection/header/request timeouts and graceful shutdown are configured.
- Public blog reads sanitize historical HTML again. Browser asset helpers reject alternate schemes and protocol-relative paths. React continues to escape project text.
- Production builds embed CSP before scripts: scripts from self only, no object embedding, restricted connections and fonts. Inline styles remain allowed for React animation/chart/cropper compatibility. HTTPS images remain permitted for existing external media. API origin is derived from VITE_API_URL at build time; rebuild after changing it.

## Deployment still required

These are repository changes, not a live server security certification. Deploy the backend and frontend together, run `npm ci`, rebuild the frontend, run `npm run check:production`, restart the backend with updated environment and verify readiness. Review [PRODUCTION-CHECKS.md](PRODUCTION-CHECKS.md) for S3 and Nginx routing.

The built HTML CSP cannot enforce frame-ancestors. On the actual Nginx frontend HTML/fallback location, add these headers while preserving existing headers and their inheritance:

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "frame-ancestors 'none'" always;
```

If a CSP header already exists, merge frame-ancestors into that policy instead. Multiple CSP policies are enforced together. Keep HTTPS/HSTS, dotfile denial, firewall, SSH restrictions, IAM least privilege, S3 versioning, backups/restore tests, security updates and monitoring under deployment management. Verify the actual proxy topology and run `nginx -t` before reload. This workspace does not contain the active server configuration; it has not been changed remotely.

After deploy, smoke-test login/logout, all five project types, upload/replace/remove/delete, a viewer account, light/dark/mobile views, fonts, GitHub widgets, blogs and resume. Check the browser console for CSP violations. Never test destructive requests against real records without a backup.

## Verification and limits

Backend regression tests cover project CRUD and multipart image lifecycle using mocked MongoDB/S3, role restrictions, unsupported token algorithms, invalid input, legacy blog HTML and origins. Browser checks use isolated API fixtures, not production writes. Real S3 PUT/DELETE and server headers still require deployment verification.

Production dependency audits are checked separately from build dependencies. Existing Tailwind 3 build dependency advisories and the lazy world-map chunk warning are tracked in PRODUCTION-CHECKS.md. No application can be guaranteed tamperproof; these controls reduce risk but do not replace infrastructure operations or a dedicated penetration test.

Verification for this release: 48 backend tests and 3 frontend tests passed; the Vite production build passed; both production dependency audits reported zero vulnerabilities. Desktop (1440 px) and mobile (390 px) browser checks passed using mocked API data, including project filtering/search, multipart submission with a cover, viewer restrictions, and no page errors. The built frontend was also tested with CSP active: normal project flows had no CSP violations and a deliberately injected inline script was blocked. Dark desktop and light mobile screenshots were visually inspected. Existing build-time advisories and the world-map chunk warning remain as described above.
