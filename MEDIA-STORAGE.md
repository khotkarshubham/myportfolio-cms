# Media storage and S3 rollout

The CMS supports blog cover upload/replacement/removal and accessible image descriptions. Covers appear in the writing listing and article page. Profile settings also manage the light/dark homepage hero backgrounds. Profile photos, resumes, projects, certifications and company logos use the same storage layer. Article-body image uploads are not part of this change.

MongoDB continues to store content and stable `/uploads/...` media references. S3 stores the binary media, not the application database. No bucket names, credentials or expiring URLs are stored in articles.

## Layout

New uploads use random immutable filenames:

```text
portfolio/production/
  blogs/YYYY/MM/<timestamp>-<random>.webp
  hero/light/YYYY/MM/<timestamp>-<random>.webp
  hero/dark/YYYY/MM/<timestamp>-<random>.webp
  profile/YYYY/MM/<timestamp>-<random>.jpg
  resume/YYYY/MM/<timestamp>-<random>.pdf
  projects/YYYY/MM/<timestamp>-<random>.png
  certifications/YYYY/MM/<timestamp>-<random>.pdf
  experience/YYYY/MM/<timestamp>-<random>.png
```

Use a different `S3_PREFIX` or bucket per environment. Legacy files retain their existing category/filename so existing references keep working. The server redirects `/uploads/...` to CloudFront when `MEDIA_PUBLIC_URL` is configured, or to a short-lived signed S3 GET URL otherwise. The bucket can remain private. These are public portfolio assets; a draft article does not make its cover URL private.

## Configuration

Merge `backend/.env.example` into the existing backend configuration. Keep `MEDIA_STORAGE=local` until copying and verification are complete. `UPLOAD_DIR` is resolved against the backend process working directory: use an absolute path in production and migration commands to avoid copying the wrong directory. This repository has both root and backend upload locations; inspect the deployed configuration to identify the real source.

Set `S3_BUCKET`, `AWS_REGION` and `S3_PREFIX`. With `MEDIA_STORAGE=s3`, missing bucket/region fails startup. SDK credentials come from the standard AWS provider chain: prefer an instance/task IAM role in production and an AWS profile locally. See [AWS credential provider documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/).

Keep S3 Block Public Access enabled, use bucket-owner-enforced object ownership, default encryption and versioning. Scope the backend role to `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on `arn:aws:s3:::YOUR_BUCKET/portfolio/production/*`. The migration uses conditional writes and HEAD reads; it needs GetObject and PutObject. If using KMS encryption, grant the corresponding key permissions. No object ACL permissions are needed.

For CloudFront, configure Origin Access Control and its scoped read bucket policy. Set `MEDIA_PUBLIC_URL=https://YOUR_DISTRIBUTION_DOMAIN` with no origin path or prefix duplication. Restrict the distribution to the intended public media prefix. Backend uploads do not require browser S3 CORS rules. Without CloudFront, signed redirects have `Cache-Control: no-store` and expire after 15 minutes; database URLs remain stable.

## Migration

From `backend`, using the same absolute `UPLOAD_DIR` and target prefix planned for production:

```sh
npm run migrate:media
npm run migrate:media -- --apply
```

The first command only prints the copy plan. The second copies without deleting source files or editing MongoDB. Re-running verifies matching SHA-256 metadata and refuses to overwrite a different existing object. Unknown files and symlinks stop the migration so they cannot be silently missed. Existing source files are trusted migration inputs; new uploads undergo MIME, extension and signature checks.

Pause CMS writes during the final copy and cutover. Verify representative URLs for every media category, then set `MEDIA_STORAGE=s3` and restart the backend. Check upload, replacement, removal and resume download with your actual AWS role. Keep the original files and database backup until verification is complete. Rollback to local storage requires copying any media created after cutover back to the matching local paths first.

The bundled homepage backgrounds remain as fallbacks. Upload `frontend/public/home-light-mode.webp` and `home-dark-mode.webp` through Profile's new hero fields to move those assets into managed S3 storage; subsequent replacements need no frontend deployment.

## Limits and operations

Uploads accept JPEG, PNG, WebP and (for resume/certificate fields) PDF, with a 5 MB per-file limit. File extension, MIME and binary signature must agree. Uploads are authenticated and role checked before parsing. Files are validated on disk, copied to S3, then staging files are removed. Provision writable ephemeral storage and enforce request/concurrency limits at the reverse proxy.

Failed HTTP saves trigger best-effort removal of new files; replaced media is deleted after successful persistence. Cleanup failures are logged and should be monitored. Process termination or network failures can still leave orphan objects; periodically reconcile bucket objects against database references after a suitable grace period. Do not apply blanket expiration to active media. Configure noncurrent-version retention separately if using bucket versioning.

Validation and automated tests use mocked S3 calls; a real bucket/CloudFront smoke test is required before production cutover. No live data is moved by installing this code.
