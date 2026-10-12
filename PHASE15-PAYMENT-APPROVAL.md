# Phase 15: Vendor Payment Approval

Implemented 2026-10-12. This increment covers supplier bill settlement. Payroll, advances, ordinary expenses and payment reversal approval queues remain separate work.

## Use

1. Accounts or Admin opens **Vendor Payables → Statement → View Bill → Request Vendor Payment**. Enter the amount, date, payment method, reference and notes, then **Submit Payment Request**.
2. An independent Admin opens **Approvals → Vendor payment approvals**, views the request and approves or rejects it. The requester cannot review their own payment, including an Admin requester. With only one Admin, use an Accounts requester and that Admin as reviewer.
3. Accounts or Admin opens **Payment Requests**, views an Approved request and selects **Post approved vendor payment**. This records the settlement in the existing cash ledger and purchase payment history. It does not initiate a bank transfer or add material purchase cost again.

Submission and approval do not change paid, due, cash or profit. Posting creates exactly one linked purchase payment and cash transaction, then changes the request to Posted. All other roles, including Project Manager, are denied this financial page/API; their existing operational Approval Inbox remains available without its payment tab.

## Correction and protections

Payment details are immutable. A rejected request stays in history; submit a new corrected request from the bill. The requester or Admin can cancel a pending/approved request with a reason. A reversed or posted request cannot be reused.

Approval and posting validate the current bill fingerprint and outstanding balance. A changed supplier bill, vendor, project, purchase total or line content requires cancellation and fresh submission. An approval does not reserve funds/balance; multiple requests can be approved, but every posting rechecks the remaining due. Versions and serializable row locks reject stale review and duplicate posting. Direct payment posting without an approved request is rejected; the payment amount, date, method, reference and notes must match the approved request exactly.

Open requests lock bill content and supplier bill metadata edits. Bill deletion and related project deletion are protected by request history. Every submit, decision, cancellation, posting and approval-managed reversal stores actor, role, time, notes and a snapshot. Admin can reverse a newly approval-managed payment from Vendor Payables with a required reason; the linked cash entry is reversed using the existing workflow and history remains. Accounts cannot reverse those new payments. Legacy payments retain their existing correction rules; unlinked historical payments are not automatically reversed.

Migration `20261012170000_vendor_payment_approval` only adds request/event tables. Existing users, balances and payment history are not rewritten or automatically approved. Role pages add Payment Requests only for Admin/Accounts. Bank account controls, budgets, amount limits, fund reservation, attachments, configurable multiple approvers and global outgoing-payment approval are not included.

## Verification

All 46 backend tests passed, including independent review, role restrictions, exact payment payloads, stale versions/bills, simultaneous posting, balance revalidation, unchanged cash before posting, reversal history and prior cash/stock/payroll/CRM/procurement workflows. Temporary accounts and fixtures were removed. Migration, Prisma generation, frontend production build, focused lint and syntax/diff checks passed. The existing bundle-size warning remains. Browser verification is read-only; no real vendor payment or business decision is submitted by the agent.
