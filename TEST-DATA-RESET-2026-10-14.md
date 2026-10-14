# Clean start for deployment — 2026-10-14

User confirmed all application business records were test data and requested clearing them before moving to cPanel. Previous phase was committed as `05b799b`.

## Completed locally

- Fresh pre-reset backup verified by isolated restore: 54 tables, 262 rows. Private directory: `server/local-backups/bei_restore_verify_1791958165777_ca0c4a71/`.
- Deleted 225 rows: all business/master test records, attachments/photos in database, approvals, audit events, assignments and the non-Admin test account. Categories and materials are empty too, as requested for a fresh start.
- Retained the one active Admin with its original complete row, including password hash, unchanged. Retained all 36 migration records and all database tables/schema. ID sequences were not reset.
- Reset used transactional DELETE statements. It refused remote databases, unknown tables, absent active Admin, stale/unverified/changed backups and source changes after backup. Foreign-key checks were temporarily disabled only on the reset connection, then restored; all business tables were verified empty before commit.
- Reconciliation afterwards: zero purchases, invoices, payroll accruals, overhead allocations or movements; zero findings.
- Reloaded the authenticated browser: Dashboard has zero projects/customers/income/expenses/cash and no transactions. Admin session remains valid. Password was not read, entered or changed.
- Five guard/reconciliation tests passed; syntax check passed.

## Clean export

Created and independently restored a second, clean backup after reset:

`server/local-backups/bei_restore_verify_1791958257174_9ccf3394/database.sql`

Verified 54 tables / 37 rows (one Admin plus 36 migration records), full schema and row-content hashes equal. Only generated restore-test databases were dropped. All backups/manifests are ignored by Git; no SQL or credentials are committed.

This SQL is a private candidate for importing into a new cPanel database. It contains the Admin password hash, so do not place it in public web folders. No remote/cPanel database has been changed and no site has been deployed.

## Next deployment work

Confirm hosting supports the application's Node runtime and process hosting, then prepare the production build, environment configuration, database connection/migrations and domain/API paths. Keep the existing Admin password for first login; any password change should be completed by the owner. Do not upload old test backups as the production database.

Earlier reconciliation reports describe the pre-reset test dataset and no longer represent current business balances. The originals remain recoverable only in the private pre-reset backup.
