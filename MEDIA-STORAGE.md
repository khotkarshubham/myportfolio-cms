# Media storage

## Bucket layout

With S3_PREFIX empty, objects are stored directly at the bucket root:

```text
images/
  hero/home-light-mode.webp
  hero/home-dark-mode.webp
  blog/<blog-slug>/<image-name>-<unique-id>.webp
  project/<project-slug>/<image-name>-<unique-id>.png
  profile/profilepic-<unique-id>.png
  experience/<company-slug>/<image-name>-<unique-id>.png
  certification/<name-slug>/<image-name>-<unique-id>.png
document/
  resume/resume-<unique-id>.pdf
  certification/<name-slug>/<filename>-<unique-id>.pdf
```

Hero migration uses fixed names. Other uploads use unique filenames to prevent overwrite races and stale cached replacements. Extensions retain their actual validated type. Blog slugs remain stable on title edits; project uploads reuse the existing media folder when available. New folders are selected after multipart parsing, so file/field order does not affect naming.

MongoDB stores stable /uploads/images/... and /uploads/document/... references. The backend redirects to public S3/CloudFront URLs or signed S3 URLs (15 minutes). Runtime uploads use bounded memory and write directly to S3; there is no local serving or disk staging. Images are publicly viewable portfolio assets, including covers whose article is still a draft; bucket access itself stays private.

## Backend environment

```dotenv
MEDIA_STORAGE=s3
# Migration input only; ignored by the running API:
LEGACY_UPLOAD_DIR=/var/opt/uploads
AWS_REGION=ap-south-1
S3_BUCKET=khotkarshubham.in
S3_PREFIX=
S3_LEGACY_PREFIX=portfolio/production
MEDIA_PUBLIC_URL=https://s3.ap-south-1.amazonaws.com/khotkarshubham.in
```

An empty S3_PREFIX puts new media at the root. S3_LEGACY_PREFIX preserves reads/deletions for old /uploads/blogs, /uploads/projects, /uploads/hero, etc. references. Set it to the prefix actually used by the earlier deployment (empty if old objects were at root). Do not change prefixes after migration without copying the corresponding objects. Nonempty S3_PREFIX remains supported for isolated development environments.

Attach backend/policies/portfolio-media-access.json to the backend IAM user/role. It includes the new root folders and the old production prefix during transition. For this public media bucket, allow GetObject on images/* and document/* through the bucket policy; keep public ACLs blocked and ACLs disabled. Use SSE-S3 encryption and versioning. Public-policy blocks must permit the intended read policy. For private S3 with signed URLs or CloudFront OAC, keep all public-access blocks on and leave MEDIA_PUBLIC_URL blank (signed URLs) or set the CloudFront origin. Credentials belong only in the backend environment or an IAM role. SSE-KMS requires additional key permissions. CloudFront is optional: configure OAC and a bucket policy restricted to the distribution, then set MEDIA_PUBLIC_URL to its HTTPS origin without a duplicated prefix. No S3 browser CORS configuration is needed for backend uploads and normal image display.

## One-time migration on Ubuntu

Deploy the updated backend and frontend media support first, install backend dependencies, back up MongoDB, and pause CMS edits. Run these from the backend directory containing package.json and .env, setting LEGACY_UPLOAD_DIR to the old uploads directory:

```sh
npm run migrate:heroes -- --source-dir /var/www/nginx/portfolio-web
npm run migrate:layout
```

These preview operations do not modify files or MongoDB. The layout preview reads MongoDB references and source media, using local uploads first and S3 under S3_LEGACY_PREFIX if local files are absent. Check that the expected content appears. Then apply:

```sh
npm run migrate:heroes -- --source-dir /var/www/nginx/portfolio-web --apply
npm run migrate:layout -- --apply
```

The hero command copies the two Nginx files to their exact fixed names and links the profile only after both verify. It accepts the old fixed hero references from the previous migration but refuses to replace unrelated custom hero settings.

The layout command reorganizes referenced blogs, projects, profile photos, resumes, certifications and company logos. Each file is copied and verified before its database reference is conditionally updated. No new local copies are written. Reruns skip already-organized records and safely resume partial work; conflicting objects or concurrent content edits stop the command. External/default static assets and unreferenced files are not moved. Old source files and S3 objects are retained; clean them up only after checking database references and your backups.

After both commands succeed, run npm run check:production on Ubuntu, then restart the backend with MEDIA_STORAGE=s3 and the updated environment. Local mode is rejected at startup. If migrating an old local deployment, keep its existing process running until migration succeeds; the new scripts require MEDIA_STORAGE=s3. Ensure Nginx forwards backend /uploads requests to Node in S3 mode rather than serving an old local alias. Verify heroes, a blog cover, a project image and resume download. Reload the website after migration. Hero URLs are hardcoded public S3 URLs in the frontend; CMS hero upload controls are removed. Keep original files only as migration backups.

The older migrate:media command only copies the existing filesystem hierarchy without reorganizing records; use migrate:layout for the new structure.

## Validation and operations

New uploads enforce a 5 MB per-file limit and matching extension, MIME and binary signature. The API permits four concurrent upload preparations per process, at most two 5 MB files per request, and 60 media writes per admin per 15 minutes. Failed saves trigger best-effort cleanup; replacements delete old media after persistence. Cleanup failures are logged. Process termination can leave orphan files; reconcile after a grace period rather than expiring all active media. Configure retention for noncurrent S3 versions separately.

The scripts preserve existing data but do not deploy, change IAM policies, or enable S3 mode. Automated tests mock AWS and MongoDB; perform a real AWS smoke test before cutover.

The readiness endpoint checks MongoDB, required environment, and a cached authenticated S3 HEAD of the fixed light hero. It no longer checks local directories. Run check:production from the deployed backend for read-only validation of every referenced media object and its public URL. Browser admin metadata is held in memory and refreshed through /auth/me; only theme preference remains in localStorage.
