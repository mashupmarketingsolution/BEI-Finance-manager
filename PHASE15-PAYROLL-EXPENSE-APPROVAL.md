# Phase 15: Payroll Settlement and Expense Approval

Implemented 2026-10-13. New wage payments and ordinary expense posting require independent approval. Earned-wage accruals, attendance and payroll batch generation continue recording costs separately from cash settlement.

## Use

1. Accounts/Admin opens **Project Profit & Loss → Payroll & overhead entries → Request wage payment**, or **Expenses → Add Expense → Submit Expense Request**. Describe an expense and select its date, amount, method and relevant project/category/person.
2. Another Admin opens **Approvals → Payroll / Expense approvals**, reviews the details, then approves or rejects. Requesters cannot review their own requests, including an Admin requester. With one Admin, use an Accounts requester and that Admin as reviewer.
3. Accounts/Admin opens **Financial Requests**, views an Approved request and selects **Post approved financial entry**. The system records the cash entry and, for payroll, its existing wage-payment link in one transaction.

Pending/approved requests create no transaction or payroll payment. Expense costs begin when the approved expense is posted. Wage costs remain in earned payroll and are not counted again on payment. The other five roles have no Financial Requests page/API; Project Manager's operational approvals do not include these financial decisions.

## Corrections and guards

Request details are immutable. Rejection or cancellation requires a reason; the requester/Admin may cancel pending or approved requests. Submit a corrected request after rejection/cancellation. Approval-managed expense amounts, dates, links and notes cannot be edited through Expenses/Transactions; Admin reverses them with a reason from Financial Requests and then submits a replacement. Payroll can also use its existing reversal endpoint, which requires Admin and a reason for newly approval-managed payments.

Every submission, decision, cancellation, posting and reversal stores actor, role, date, reason and a snapshot. Reversed requests cannot be posted again. Overhead allocations must be removed before reversing an allocated expense. Allocation itself retains its existing workflow and creates no extra cost/cash payment.

Payroll submission/approval/posting recheck earned date and unpaid amount after existing payments and advance allocations. A changed wage record invalidates approval. Versions and serializable locks reject stale or concurrent decisions and duplicate posting. Concurrent requests can be approved, but approved amounts do not reserve wages/funds; posting rechecks the current unpaid amount. Open requests protect wage deletion, attendance payroll undo and batch undo. Cancelling open requests and reversing settlements allows the existing accrual/batch correction workflow; cancelled/reversed request snapshots survive later source removal. Related project deletion is protected by approval history.

Direct legacy expense/payroll posting APIs require an approved request and exactly matching details. The new Financial Requests posting API uses the stored approved payload, not client-supplied payment fields. Expense posting revalidates linked records and expense categories. Existing transaction sources and report calculations are retained.

Migration `20261012180000_payroll_expense_approval` adds request/event tables and optional links; it does not rewrite historic balances, users, expenses or wage payments. Legacy expense/payment corrections retain existing rules. Worker advance disbursement and advance allocation approvals, earned-payroll approval, general overhead allocation approval, approval limits, fund reservation and configurable multi-step review remain outside this increment. This is not a claim of approval coverage for every historical financial mutation.

## Verification

All 48 backend tests passed. New coverage includes role restrictions, own-review denial, exact approved posting, stale wages/versions, duplicate posting, unpaid-wage revalidation, unchanged cash before posting, managed-entry edit guards, correction history and protected wage/batch/project removal. Existing cash, stock, payroll batch, advance, vendor billing, CRM and procurement tests continue passing through independent approval where needed. Temporary test users and fixtures were removed.

Prisma validation, migration/generation, production build, focused component lint and syntax/diff checks passed. Browser verification is read-only; no real expense, payroll payment or approval is submitted by the agent. The existing frontend bundle-size warning remains.
