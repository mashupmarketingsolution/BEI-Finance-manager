# Backup restore

Admin → Backups → Restore a backup accepts an encrypted `.sql.gz.enc` downloaded from Drive. The 7 daily + 4 weekly retention policy is unchanged.

The app authenticates/decrypts the file with its **existing private encryption key**. A key is never accepted through the web API or shown to the browser. On replacement hosting, the operator must first configure the original recovery key privately; a newly generated key cannot open old backups.

## Two stages

1. **Upload and verify**: maximum 50 MB encrypted / 256 MB decompressed. The preview checks authenticated encryption, supported table-dump syntax, exact table names, and completed Prisma migration names/checksums against the current app. It shows table/record totals and encrypted-file SHA-256. Cross-version backups need operator review; routines/events/triggers and arbitrary SQL files are unsupported. Preview expires after 30 minutes.
2. **Restore to a separate database**: requires current Admin password and the exact `RESTORE TO <database>` confirmation. The target must still be empty at import time. Only a separately configured database user restricted to that target is accepted. The importer cannot access the live database with its restore credentials. A shared backup/restore lock prevents overlapping runs. Completion verifies restored table names/types and every table's row count. The current live database is never overwritten.

Failed imports may leave partial data **only in the restore target**. The app does not delete those records automatically. An operator must review/recreate the empty target before a retry. Decrypted staging SQL and uploaded encrypted staging files are removed after an attempted import; unused previews expire and are cleaned on subsequent restore requests. A process crash leaves a private lock and RUNNING record for operator review; verify no worker is active before clearing them. Status survives page navigation/restart and is available only to the requesting Admin. No records/password hashes/connection secrets are returned in previews.

## Hosting configuration

Create a new empty MySQL database and a dedicated user whose privileges cover **only that database**, without global privileges or grant delegation. Give it the table/schema privileges needed for import; never reuse the live database user. In the app's private environment configure:

```text
RESTORE_DATABASE_URL=mysql://RESTORE_USER:URL_ENCODED_PASSWORD@localhost:3306/RESTORE_DATABASE
MYSQL_BIN=/bin/mysql
```

This must use the same host/port as the live database and a different database/user. Credentials are entered privately by the owner/operator, never committed. Restart the app after setup. With no target configured, encrypted upload/verification still works and the UI explains that hosting setup is needed. cPanel database limits may require a larger hosting allowance; do not delete another database to make room automatically.

After a successful restore, review the restored data, preserve the current database and original encryption key, then switch the private DATABASE_URL to the restored database and restart the app during a planned maintenance window. Rotate JWT_SECRET to invalidate old sessions when performing that deliberate cutover. The app does **not** silently switch databases, overwrite current data or restore application source/environment/Drive tokens. Keep separate recovery copies of source, environment and encryption key. Run a fresh verified cloud backup after cutover.

## Validation

- API tests cover Admin-only access, file tampering, SQL rejection, migration parsing, ownership, expiration, confirmation/password, backup locking, failed-import cleanup, empty-target checks and narrowly scoped grants.
- A real local MySQL import of generated fixtures verifies Bengali text and table row counts; only the generated test database is removed. Local XAMPP's privilege tables returned an Aria checksum error during the initial dedicated-user integration attempt; the permission guard is covered with controlled fixtures, not a claimed successful live-host restore.
- UI tests cover setup-required verification, exact confirmation/password, file limits, completion and reopening a running job. Production build/lint and backup regression tests are required before release.
- Production restore is intentionally not run until the owner creates and configures a dedicated empty target. This feature does not overwrite the production database as a deployment test.

Live deployment on 2026-10-14: Admin browser upload of the original encrypted production backup passed authenticated decryption/table/migration preview (54 tables, 39 records). Source rollback archive was retained privately before release. Dedicated production restore target remains unconfigured; no production import or cutover was performed. Build/lint passed; 16 UI tests passed; backend fixture/regression tests and the real isolated local importer test passed.

Owner approved and cPanel Wizard successfully created the empty robilea1_pos_restore database on 2026-10-14. Wizard Step 2 is handed to the owner for a new dedicated database user/password and grants only to this database. RESTORE_DATABASE_URL and a production restore test remain pending owner private configuration.
