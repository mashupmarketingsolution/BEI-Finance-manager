# Phase 13: Site Inspections

Implemented 2026-10-12, following daily reports and site tasks.

## Use

Open Site Reports → Site inspections → Add inspection. Choose project, inspection date and active inspector, then enter a title and 1–100 checklist items. Optionally link an existing task and daily report from that project. Save the draft, view its details and edit results as work is checked.

Each check is Pending, Pass, Fail or Not applicable. Fail requires an issue description. Correction states are Open, Fixed (awaiting recheck) and Verified. Fixed requires corrective action text, an active owner and a due date; Verified additionally requires recheck notes. Open issues may have a planned owner/date/action. Overdue means an unverified failed check in an active inspection with a due date before today in Asia/Dhaka; an unset due date is not overdue.

Complete inspection is available from details and is rejected until no checks are pending and every failed check has a verified correction. Recorded failures cannot be deleted or converted to Pass/Not applicable: their corrective action remains visible. Completion locks editing; Reopen returns it to draft and clears completion time. Archive/restore preserve the checklist and links.

## Data integrity and scope

- Business APIs require an active login. Inspector and corrective owners are existing active user accounts; no invitations or notifications are sent. Inactive people must be replaced when editing. Historical owners without a current active name display their user ID.
- Creator/latest editor and completion time are stored. Verification actor and timestamp are set by the server, ignoring client-supplied stamps. Unchanged verified evidence keeps its stamp; edited evidence records a new stamp. These fields do not constitute full revision history or role-specific approval.
- Checklist IDs are unique, texts have bounded lengths, and dates must be valid. Inspection dates cannot be future dates; corrective due dates can be future or past.
- Row locks, serializable transactions and optimistic version checks reject stale changes. Completed or archived records cannot be edited until reopened/restored.
- Project is immutable after creation. Optional report/task links must belong to that project. Restore archived linked records before adding/removing/changing links. A report with an inspection link cannot move to another project until unlinked.
- No hard-delete inspection API exists. Projects with inspection history are protected from deletion. Draft non-failed checks can be removed; failure history is retained within the current checklist. There is no full audit/revision log yet.
- Completion is a quality recheck, not managerial approval. Inspections do not alter task status, project progress, stock, payments, payroll or accounting. Photos remain in daily reports, which can be linked to an inspection; inspection-specific attachments and templates are outside this increment.

## Verification and deployment

Applied `20261012120000_site_inspections` through Prisma migrate deploy and regenerated the client. Prisma validation, production build and focused frontend lint passed. All 34 backend unit/integration tests passed, including validation, cross-project links, active assignment, unverified completion rejection, protected failed checks, concurrent stale updates, verification stamp integrity, completed editing guards, reopening, archived links, archive recovery and protected project history. Fixtures were cleaned up. Browser checks confirmed inspector/project choices, project-specific report options and corrective fields appearing for Fail, without saving real inspection records. Existing bundle-size warning remains.

Phase 13 still needs role-based approvals; the broader permissions and durable audit work remains in Phases 17/18.
