# BE Interior ERP: original roadmap and verified status

Source: “BEI Finance Manager Phases আলাদা করা”, Pasted markdown.md attachment, recovered 2026-10-11 from https://chatgpt.com/c/6a886072-57ec-83ee-a2c6-37772db067e5 . The source has 18 numbered phases and a separate 20-item priority list (splitting procurement and adding Mobile/PWA). Priority order is not phase numbering.

| Phase | Original scope | Current status / remaining work |
|---|---|---|
| 1 | Materials Master | Core implemented; photo and full source checklist still need completion/verification |
| 2 | Vendor Price Comparison | Vendor prices and lead times implemented; complete recommendation/history scope needs verification |
| 3 | BOQ / Estimation | Estimation and selected-BOQ purchase-cost/variance comparison implemented; consumption valuation remains outside scope |
| 4 | Purchase Request → RFQ → PO | Core workflow exists; receiving integrity fixes included in this review |
| 5 | Inventory / Stock | Receive/usage/return/damage/adjustment exist; reservation and transfer remain |
| 6 | Client / CRM | Core pipeline/conversion/customer history tested; follow-up/activity workflow remains |
| 7 | Quotation / Estimation | Core pricing, milestones, revisions and acceptance tested |
| 8 | Client Billing / Receivables | Core invoices and receipts tested; PDF and receipt splitting remain |
| 9 | Vendor Payables | Core statements/payments/reversal tested; unlinked historical payments cannot be automatically reversed |
| 10 | Full Accounting | Not implemented: chart of accounts, balanced journals, ledger, trial balance, balance sheet and accounting cash flow |
| 11 | Project Job Costing | Purchase/consumption bases, weighted stock valuation with incomplete-history warnings, accrued wages and manual overhead allocation implemented; BOQ purchase variance and margin available |
| 12 | Worker / Labour Management | Wage rates, attendance/overtime, atomic pay-period batches, advance allocation/reversal and worker statements implemented; wage partial payment/reversal retained; actual advance refunds, approvals and durable actor/action audit remain |
| 13 | Site Management | Reports/photos, tasks, inspections and independent role-based inspection approval with immutable review snapshots implemented |
| 14 | Documents / File Management | Full workflow remains |
| 15 | Approval System | Inspection/PR/PO review and gated conversion, vendor payments, wage settlements, worker advance disbursement and new ordinary expenses require independent approval with preserved posting/correction history. Advance allocation, earned-payroll/overhead allocation approval, limits and configurable multi-step approvals remain |
| 16 | Reports & Business Intelligence | Some dashboard/report foundations exist; full management reports remain |
| 17 | User Roles & Security | Only Admin has every page; seven role-specific page/API allowlists, account creation/access management, private Stock Desk and stale-change guards implemented; permissions are company-wide, not project-assignment-specific |
| 18 | Audit Log / Security | Admin-only authenticated API mutation/attempt history, selected before/result snapshots and credential exclusions implemented; login/security monitoring, retention/export and tamper-proof external storage remain |

Additional priority item: Mobile / PWA. No claim that all 18 phases are complete.

## Review fixes, 2026-10-11

- All business API routes require an active login. Only POST login and GET health are public under /api. This does not implement role-based access control.
- Partial project updates preserve customer ownership when customerId is omitted.
- Duplicate receive item IDs are rejected. Receipt quantities use conditional updates in serializable transactions. Concurrent stock usage/returns/damage/adjustments use material row locks and transactional checks; negative stock and excess returns are rejected.
- Transactions retains the complete ledger but its cash debit/balance aggregates exclude PURCHASE accrual mirror entries. PURCHASE_PAYMENT remains cash settlement. Historical unlinked ledger entries are not guessed or rewritten.
- Dashboard Cash Balance uses income minus non-purchase cash expenses and purchase payment history. Total Expenses still shows accrued recorded expense cost. Cash balance has no opening bank balance/reconciliation and is not a bank statement balance.
- MySQL searches no longer use unsupported Prisma case-insensitive mode; matching follows database collation.
- Renamed the old Phase 10 report document to Phase 11, matching the original roadmap.

Existing business records are preserved. These fixes prevent future corruption; any historical stock discrepancy requires a separately reviewed correction. Existing backups and dumps remain excluded from commits.

Verification: 17 unit/integration tests passed, including concurrent receiving, usage and returns, duplicate-item rollback, customer preservation, unauthenticated access rejection, transaction search and cash totals. Production build, focused component lint and Prisma validation passed. The existing bundle-size warning remains. Read-only purchase receipt checks found 11 legacy purchase/material groups using referenceType PURCHASE rather than PURCHASE_RECEIVE; each matched its recorded received quantity, so no data rewrite was needed.
