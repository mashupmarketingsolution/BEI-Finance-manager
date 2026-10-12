# Phase 14 — Documents / File Management

Implemented project-linked document upload, immutable file versions, authenticated downloads, archive/restore, project/title/status filters and 10/25/50/100/All pagination. Metadata lists never return file bytes. Versions retain original name, size, SHA-256, uploader name and time. Archive/restore keeps file history; projects containing documents cannot be deleted.

## Access

Admin sees all categories and projects. Accounts sees FINANCIAL, Procurement Officer PROCUREMENT, Storekeeper STOCK. Project Manager and Site Supervisor can manage TECHNICAL documents in assigned projects. Viewer can read/download TECHNICAL documents in assigned projects only. Every endpoint, including old-version downloads, enforces category and project access. Department roles retain company project lookup for their own document workflow. No public file links or automatic project assignments.

## Storage and limits

Files are stored in MySQL as LONGBLOB alongside metadata in the same transaction. Include document tables in the normal private database backup. Supported types: PDF, PNG, JPEG, WebP, DWG. Extension and signature must match; names reject separators/control characters. Downloads use attachment, nosniff and private/no-store headers. This is basic type validation, not an antivirus scan or full document parser. Office files, inline previews, sharing links, tags and retention/purge administration remain follow-up work.

Maximum upload is the smaller of 10 MiB and MySQL max_allowed_packet minus 64 KiB; the UI shows the actual limit (about 0.9 MiB on the current local database). Larger drawings need an administrator-approved packet setting increase or a future private storage backend. No server settings were changed.

Archive and upload take a document row lock and check the current metadata version. Concurrent/stale changes return 409. File version numbers remain sequential across archive/restore. File bytes are excluded from audit snapshots; document creation, revisions and archive/restore are recorded in the existing audit log. No permanent file-delete API is supplied.

## Validation

`CRM_INTEGRATION=1 node --test --test-concurrency=1 documents.test.js access-control.test.js extra-roles.test.js project-access.test.js audit-log.test.js`

Coverage includes signature/name rejection, wrong-project and wrong-department access, Viewer write denial, exact old-version bytes, cross-document version IDs, concurrent/stale revision protection, archive/restore and audit recording. Fixtures are temporary and cleaned. Production client build and focused ESLint pass. Browser Documents page inspected with the real project lookup, categories, limit and pagination; no real documents were uploaded.

Migration: `20261013030000_documents`. Run normal Prisma migration deploy and generate when installing elsewhere.
