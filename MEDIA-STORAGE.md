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

MongoDB stores stable /uploads/images/... and /uploads/document/... references. The backend serves local files or redirects to signed S3 URLs (15 minutes) / CloudFront. Images are publicly viewable portfolio assets, including covers whose article is still a draft; bucket access itself stays private.

## Backend environment

```dotenv
MEDIA_STORAGE=local
UPLOAD_DIR=/var/opt/uploads
AWS_REGION=ap-south-1
S3_BUCKET=khotkarshubham.in
S3_PREFIX=
S3_LEGACY_PREFIX=portfolio/production
MEDIA_PUBLIC_URL=
```

An empty S3_PREFIX puts new media at the root. S3_LEGACY_PREFIX preserves reads/deletions for old /uploads/blogs, /uploads/projects, /uploads/hero, etc. references. Set it to the prefix actually used by the earlier deployment (empty if old objects were at root). Do not change prefixes after migration without copying the corresponding objects. Nonempty S3_PREFIX remains supported for isolated development environments.

Attach backend/policies/portfolio-media-access.json to the backend IAM user/role. It includes the new root folders and the old production prefix during transition. Keep all S3 Block Public Access settings on, ACLs disabled, SSE-S3 encryption and versioning enabled. Credentials belong only in the backend environment or an IAM role. SSE-KMS requires additional key permissions. CloudFront is optional: configure OAC and a bucket policy restricted to the distribution, then set MEDIA_PUBLIC_URL to its HTTPS origin without a duplicated prefix. No S3 browser CORS configuration is needed for backend uploads and normal image display.

## One-time migration on Ubuntu

Deploy the updated backend and frontend media support first, install backend dependencies, back up MongoDB, and pause CMS edits. Run these from the backend directory containing package.json and .env, using the same UPLOAD_DIR as the running backend:

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

The layout command reorganizes referenced blogs, projects, profile photos, resumes, certifications and company logos. Each file is copied and verified before its database reference is conditionally updated. Matching local copies remain available before S3 cutover. Reruns skip already-organized records and safely resume partial work; conflicting objects or concurrent content edits stop the command. External/default static assets and unreferenced files are not moved. Old source files and S3 objects are retained; clean them up only after checking database references and your backups.

After both commands succeed, set MEDIA_STORAGE=s3 and restart the backend with the updated environment. Ensure Nginx forwards backend /uploads requests to Node in S3 mode rather than serving an old local alias. Verify heroes, a blog cover, a project image and resume download. Reload the website after migration. Keep the original frontend hero files as fallbacks.

The older migrate:media command only copies the existing filesystem hierarchy without reorganizing records; use migrate:layout for the new structure.

## Validation and operations

New uploads enforce a 5 MB per-file limit and matching extension, MIME and binary signature. Failed saves trigger best-effort cleanup; replacements delete old media after persistence. Cleanup failures are logged. Process termination can leave orphan files; reconcile after a grace period rather than expiring all active media. Configure retention for noncurrent S3 versions separately.

The scripts preserve existing data but do not deploy, change IAM policies, or enable S3 mode. Automated tests mock AWS and MongoDB; perform a real AWS smoke test before cutover.
