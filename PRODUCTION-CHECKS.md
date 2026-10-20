# Production media release checks

## Required rollout

1. Use Node.js 22.13+ (Node 24 LTS recommended), deploy the `developement` release and run `npm ci` in both app folders. Build the frontend with its real `VITE_API_URL`.
2. Configure `MEDIA_STORAGE=s3`, `AWS_REGION`, `S3_BUCKET`, empty `S3_PREFIX`, the correct `S3_LEGACY_PREFIX`, and the public `MEDIA_PUBLIC_URL`. Keep credentials in the backend environment or an IAM role. `LEGACY_UPLOAD_DIR` is only an input to migration scripts.
3. Back up MongoDB and pause content edits. If old assets have not been moved, run the preview/apply steps in [MEDIA-STORAGE.md](MEDIA-STORAGE.md) before restarting the backend. This release deliberately rejects local runtime mode; it never deletes local media backups.
4. Run `npm run check:production` in the deployed backend. This is read-only and checks MongoDB, S3 object access, and public URLs. Fix any missing object or unmigrated reference before restarting.
5. Restart the backend with the new environment. Confirm `/api/health/ready` returns 200. Log in, upload/replace/remove a blog cover, upload a resume, then verify the public article/profile/resume pages. Test viewer/editor permissions and logout. Live smoke tests require the deployed service and valid AWS credentials; local mocks do not prove production permissions or networking.

## Nginx

The backend must receive `/api/` and `/uploads/` requests. Remove any old `alias /var/opt/uploads/` route after migration. Example locations on the backend's virtual host (adapt upstream/port to your deployment):

```nginx
client_max_body_size 12m;
client_body_timeout 30s;

location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The app trusts one proxy hop. Keep Node bound/firewalled behind that proxy; do not expose its port directly. Nginx may buffer request bodies independently of Node; it must have enough temporary space. Application media is never stored on the backend filesystem.

## Automated verification

```sh
npm test --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
npm audit --omit=dev --prefix backend
npm audit --omit=dev --prefix frontend
```

Coverage includes cookie authentication, CSRF, roles, upload signatures/limits, multipart field order, S3 rollback, preservation after DB commit, removed hero fields, concurrent upload bounds, traversal rejection and idempotent migrations. Frontend tests verify that admin metadata works with browser storage blocked and does not persist across reloads.

Production dependency audits are clean at verification time. Tailwind 3's build dependency tree still reports advisories in braces/micromatch/chokidar and postcss-selector-parser. These run during trusted-source builds, not in the deployed static frontend. Do not run builds over untrusted glob patterns or stylesheets. A Tailwind major migration needs separate styling regression verification; the audit's forced upgrade/downgrade suggestions were not applied. Vite also reports the existing large world-map chunk; it is lazy loaded.

## Operational limits

Four concurrent upload preparations and the in-memory rate limiter apply per Node process; enforce fleet-wide limits at the proxy if scaling horizontally. Upload bodies are capped at two files of 5 MB plus bounded text fields. Keep process memory/headroom appropriate for that load.

Rollback is best-effort. Monitor media deletion/rollback logs. A process crash or ambiguous database/network failure can leave orphan objects; reconcile references after a grace period before deleting anything. Versioning/noncurrent-version retention are bucket administration tasks. No blanket media expiration rule is safe for active content.
