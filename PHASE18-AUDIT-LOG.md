# Phase 18: API Change History

Implemented 2026-10-13. Admin opens **Audit Log** to search actor/action paths, filter area/outcome/Bangladesh dates, choose page size or All, and view selected before/result fields. Other roles cannot read or modify this history. No edit/delete API is provided.

Authenticated POST/PUT/PATCH/DELETE requests receive a durable Pending attempt before business code runs. The result records actor ID/name/username/role, path without query parameters, method/action, target ID, HTTP status, time and Success/Failed outcome. Known entity routes include selected prior fields; JSON responses include selected result fields. Denied role changes are recorded. Login, anonymous requests, ordinary reads and the read-only payroll preview are excluded.

Password/hash/token/cookie/attachment fields are not part of the snapshot allowlist. Selected text is capped at 500 characters, arrays at 50 rows and nesting at four levels. This is selected-field history, not a complete document version or a full forensic database diff. Actor names/IDs remain when an account is deleted.

An unavailable audit insert blocks the action before it starts. Outcome finalization happens after the business operation, not in the same transaction. If confirmation fails, the Pending attempt remains and the original response includes an audit warning; Admin should verify the actual record before retrying. Existing independent approval snapshots remain authoritative for approval decisions. Direct database scripts, authentication/security monitoring, backups, retention/export and tamper-proof external storage are outside this increment.

Migration `20261013010000_audit_log` adds one table. Historical actions are not invented or backfilled. Full 52-test backend regression passed with audit enabled, including credentials, access denial, CRUD history, unavailable audit storage and preserved response on finalization failure. Temporary test users/business records and their verified audit entries were removed; real records were preserved. Frontend build, focused lint and Prisma validation/migration/generation passed. Existing bundle-size warning remains.
