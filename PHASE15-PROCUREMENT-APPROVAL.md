# Phase 15: Purchase Request and Purchase Order Approval

Implemented 2026-10-12. This increment adds independent document review; payment approval and configurable multi-step approval remain next work.

## Workflow

Create a Purchase Request as Draft and add its material quantities. Open **Procurement Review**, select Purchase requests, view the document and submit. An independent Admin or Project Manager opens **Approvals → Purchase / PO approvals** to approve or reject. Approved requests can convert to RFQ through the existing request page.

Create a Purchase Order as Draft with vendor, materials and prices. Submit it from Procurement Review and have an independent reviewer decide. Approval confirms a Draft order. Continue the existing Sent → Completed workflow before converting it to Purchase. Conversion retains the existing purchase cost/accrual behavior and creates no vendor payment.

Admin, Project Manager and Procurement Officer can submit procurement documents. Only Admin/Project Manager can approve/reject, and neither the recorded creator nor the latest submitter can decide their own document. Rejection requires a reason. Reopen requires a reason; only reviewers can reopen approved documents. Edit a reopened document, then resubmit for a fresh decision.

## Protections and rollout

Pending, approved and rejected document content is locked. Requests cannot forge approval through header status changes. Orders cannot confirm/send/complete without approval of the current quantities, vendor, prices and totals. Each review stores the actor, role, time, reason and immutable document snapshot. Row locks, review versions and content fingerprints reject stale decisions; conversion locks prevent duplicate RFQs/purchases. Reviewed document deletion and related project deletion are protected. Converted/cancelled documents retain history and cannot reopen; partially fulfilled/completed orders cannot reopen for editing.

Migration `20261012160000_procurement_approval` adds approval and event tables. Existing records are not automatically approved. Legacy creator identity is shown as unrecorded; the first submitter is still excluded from reviewing their own submission. Historical converted documents remain viewable and are not rewritten.

Standalone RFQs and manually created purchases are outside this PR/PO approval gate. This increment does not implement payment approval, approval limits, multiple reviewers, project assignment restrictions or a complete company action audit.

## Verification

All 44 backend unit/integration tests passed. New coverage includes forged initial status, item validation, content locks, stale decisions, independent reviewers, rejection/reopening, preserved snapshots, concurrent decisions, single conversion, unchanged unpaid purchase accrual and protected deletion. Temporary test accounts and business fixtures were removed. Prisma migration/generation, production frontend build, focused component lint and syntax/diff checks passed. Existing bundle-size warning remains. Browser verification uses read-only existing records; no real business approval or payment is submitted by the agent.
