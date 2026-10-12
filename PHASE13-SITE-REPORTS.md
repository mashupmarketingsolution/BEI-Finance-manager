# Phase 13: Daily Site Reports

Implemented 2026-10-12. This completes the daily reporting foundation, not the entire Site Management phase.

## Use

Open Site Reports → Add site report. Choose a project and date, enter a title and work completed, set overall progress and the responsible person, and optionally record issues and the next-day plan. Save the report, then open View report to attach photos or inspect linked activity.

The list supports project/date/state/search filters and 10/20/25/50/100/All pagination. Reports can be edited, archived and restored. One report is permitted per project/date, including archived reports; restore the existing report instead of creating a duplicate. Future dates are rejected using Asia/Dhaka. Progress is a reported overall percentage from 0 to 100 and does not change project status, contract value or accounting.

## Integrity and photos

Creator and latest editor are recorded. Version checks reject stale edits and archive/restore actions; photo changes also advance the version. Transactions lock report rows. Projects with report history cannot be deleted.

Each report accepts up to ten JPEG, PNG or WebP images. Uploads check MIME type and file signatures; this is not full image decoding or malware scanning. The per-image limit is at most 5 MB and may be lower according to the database packet limit. Photos are stored privately in the database and fetched through authenticated APIs, with no public static path. Database backups must include these attachments and remain outside ordinary Git commits. Removing a photo deletes its stored attachment; keep the original file if it may need to be attached again. Archived reports retain photos and block attachment changes.

## Linked daily activity

Report details show existing attendance for the same project/date, attendance wage previews, purchases recorded, cash received and cash paid. These are live views of existing records, not a saved financial snapshot or a daily profit calculation. Purchase accrual and purchase-payment transaction mirrors are excluded from cash-paid totals; purchase payment history is included once. Worker advances count as cash paid. Creating a report does not generate attendance, wages, payments or stock movements.

## Deployment and verification

Applied migration `20261012100000_site_reports` using Prisma migrate deploy and regenerated the Prisma client. Prisma validation, production frontend build, focused SiteReports lint and 30 backend unit/integration tests passed. Integration tests cover authentication, duplicate reports, concurrent stale updates, activity totals without payment double counting, image limits/private retrieval, archive/restore and project deletion protection. Test fixtures were cleaned up. Browser verification confirmed the project/user context, default date/responsible person, form controls and paginated empty list without creating real business records. The existing frontend bundle-size warning remains.

Remaining phase scope: site task assignment, inspections and approvals. Role-specific authorization and durable actor/action audit remain separate roadmap work; current business APIs require an active login.
