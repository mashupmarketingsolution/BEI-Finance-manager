# Phase 15: Site Inspection Approval

This is the first Approval System increment. Purchase/PO and payment approval, configurable multi-stage rules and notifications are not included yet.

## Workflow

1. Create and complete an inspection through Site Reports → Site inspections. Completion verifies checklist readiness; it does not approve the inspection.
2. Open its details and Submit for approval. Only active site writers (Admin, Project Manager, Site Supervisor) can submit. The completed checklist must be ready and the record must be active.
3. An independent Admin or Project Manager opens Approvals → Pending → Review inspection and approves or rejects. Creator, inspector and most recent submitter cannot decide their own inspection. Rejection requires a reason.
4. A rejected inspection must be reopened with a reason, corrected, completed and resubmitted. An approved inspection may only be reopened by Admin/Project Manager with a reason. Reopening clears approval and quality completion; previous snapshots remain.

Approval states are Not submitted, Submitted, Approved and Rejected, separate from Draft/Completed quality status. Pending records cannot be edited, reopened or archived, keeping the review queue and submitted content stable. Approved records remain read-only until explicitly reopened. Archive/restore retain reviewed state and history. Existing completed records migrate as Not submitted and are not automatically approved.

## Review history and integrity

Submit, Approve, Reject and Reopen append an event with actor identity, role at action time, notes, timestamp and an inspection snapshot. Snapshots retain the title, project/link IDs, inspector, checklist, notes and original version. The UI shows event history and snapshot content. There is no API to edit/delete these events. Existing protected inspection/project deletion rules still apply; this is an inspection-specific review trail, not the full Phase 18 audit system.

Transactions lock inspection rows and validate optimistic versions. Concurrent decisions yield one successful decision and a conflict for the stale reviewer. The acting user's active role is rechecked under a user row lock. Client role claims or approval fields cannot set approval state directly. UI controls assist presentation; the API enforces reviewer roles and independence.

Only Admin has every page. Other roles have explicit page allowlists described in PHASE17-USER-ACCESS.md. Approval Inbox belongs to Admin and Project Manager. Accounts, Procurement Officer, Storekeeper and Viewer cannot access its API. Roles apply company-wide; project-specific assignment restrictions remain separate.

## Deployment and verification

Applied `20261012150000_inspection_approval` using Prisma migrate deploy, validated the schema and generated the client. All 42 backend unit/integration tests passed, including explicit role/page restrictions, draft submission rejection, completion/submission, pending edit/archive guards, independent review, rejection reason, correction/resubmission, immutable snapshot content and concurrent reviewer decisions. Temporary records/users were removed. Production build and focused component lint passed. Browser checks verified Admin Approval Inbox, its state filter/pagination, and User Access's seven restricted page lists without submitting or deciding real business inspections. The existing bundle-size warning remains.
