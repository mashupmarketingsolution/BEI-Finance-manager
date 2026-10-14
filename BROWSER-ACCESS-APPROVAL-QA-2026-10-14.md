# Export, access and approval verification — 2026-10-14

Follow-up to SECURITY-FRONTEND-2026-10-14.md. This run completes the first three verification items: browser exports, role navigation/access and approval regressions. Actual-book reconciliation and backup/restore drills are separate next steps.

## Browser checks

- Used the user's existing authenticated Admin session in the in-app browser. No new account, credential or access grant was needed.
- Project Profit & Loss opened with ten projects and summary totals.
- Export Excel produced `project-profit-consumption-2026-10-14 (1).xlsx` in Downloads. ExcelJS successfully loaded all six sheets: Overview, Projects, Cost Breakdown, Stock Consumption, Manual Expenses and BOQ Purchase Comparison. Projects has ten data rows, and contract values are numeric cells.
- Export PDF produced `project-profit-consumption-2026-10-14.pdf` in Downloads. The downloaded file is 14,027 bytes, has the PDF signature and four page objects. This is structural validation, not a fresh page-by-page visual layout review.
- The previous download timeout did not recur in either check.
- Inspection, purchase/PO, vendor payment and payroll/expense/advance approval inboxes opened successfully. Pending lists were empty. No real request was approved, rejected, posted or reversed from the browser.

## Automated verification

- Added seven actual-App navigation cases, using the server's real permission policy for Admin, Accounts, Project Manager, Site Supervisor, Procurement Officer, Storekeeper and Viewer. Every sidebar link is checked for presence/absence; the tests do not create users or send writes.
- Frontend session/navigation suite: 12 passed. Full lint passed.
- Focused backend suite: 16 passed, zero failures or skips. Covers API role restrictions, financial redaction, live permission changes, assigned-project boundaries, scoped exports, independent inspection/procurement/payment/expense/payroll/advance decisions, duplicate/concurrent posting and reversal history.
- Backend integration fixtures use the local database and clean their test business records. Removed 175 audit events only after verifying the exact test actor names/IDs from this run and confirming those actors no longer exist. Real audit history and existing backup files were preserved.

## Limits and next checks

- Other roles were verified through real-App DOM tests and local API integration tests, rather than signing into each real person's browser account.
- No new product defect was reproduced in this verification run. The report correctly warns that Munshigonj has incomplete stock cost; its profit remains provisional. Reconcile missing source stock costs and the actual books before treating that profit as final.
- Next: read-only reconciliation of client/vendor dues, payroll, stock consumption and overhead against source records, then an isolated backup/restore drill without overwriting the working database.
