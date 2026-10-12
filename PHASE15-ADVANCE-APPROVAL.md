# Worker Advance Approval

Implemented 2026-10-13. **Workers → Worker Advance & Statement → Request worker advance** submits an ADVANCE Financial Request without changing cash or advance balances. An independent Admin reviews it from **Approvals → Payroll / Expense / Advance approvals**; Accounts/Admin posts the approved request from **Financial Requests**.

Amount, worker, project, date, method, reference and notes are immutable. Posting validates the worker/project again and creates the existing WORKER_ADVANCE cash transaction plus WorkerAdvance atomically. Duplicate posting and reused advance references are blocked. Advance dates cannot be in the future. Self-review is prohibited. Rejected/cancelled requests require a fresh corrected submission.

Admin can reverse an approval-managed mistaken entry with a required reason, from Financial Requests or its existing worker statement route. Undo all wage allocations first. The advance remains reversed and its approval/cash snapshots survive; this correction is not an actual cash refund. Legacy entry correction rules are retained. Wage allocation creates no extra cash/cost and continues its existing guarded workflow; separate allocation approval and actual advance refunds remain future work.

No migration is needed because FinancialRequest kinds are stored as strings. Existing advances/users/balances are not rewritten. The same Admin/Accounts page allowlist applies; other roles cannot access advance approvals/posting. Production build, focused component lint and advance integration tests pass, including unchanged cash before posting, role checks, tampered amount, duplicate posting, profit/cash separation, reversal history, future dates and worker deactivation. Temporary fixtures are removed.
