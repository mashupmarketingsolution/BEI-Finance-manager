# Phase 11: Project job costing

Phase 10 remains Full Accounting. This management report does not implement journals or recognized accounting profit.

## Usage

Open **Project Profit & Loss**. Default **Stock consumed (net of returns)** uses net material usage; choose **Purchases** for the previous basis. Search filters summaries. Details include cost groups, consumption, unpaid wages, overhead and a selectable BOQ.

Under **Payroll & overhead entries**:

1. Add unpaid wages with project, worker, unique reference, work/period, earned date and amount. Enter only wages not already expensed. Existing worker expenses remain included.
2. Use **Pay wages** for partial/full settlement. This creates a linked expense. Earned wages remain the cost; settlement changes cash and unpaid balance. Reverse mistakes here. Unpaid entries can be removed and re-entered; paid entries require reversal first.
3. Select a general expense with no project/worker and distribute amounts among projects. The sum cannot exceed the expense. Clear amounts to remove allocations. No additional expense/payment is created; unallocated amounts remain outside project totals.

## Cost rules

- Consumption replays stock by movement date, then ID, using moving weighted average value per material/unit. All warehouse receipts participate, including unassigned purchases.
- Receipts linked to purchases receive proportional grand-total value, incorporating net discount and transport. Repeated material/unit lines use weighted line prices. Otherwise recorded unitCost is used when available.
- Usage adds cost to the project. Returns reverse that project's average remaining issue cost. Damage/negative adjustments reduce warehouse stock but are not attributed to projects in the current workflow.
- Missing opening/adjustment prices, insufficient chronological receipts and inconsistent returns mark affected consumption incomplete. Partial totals display a prominent provisional warning. Unknown prices are not claimed to be verified zero costs. Existing history is not automatically rewritten.
- Valuation replays current dated history, not a locked period ledger. Backdated receipts and purchase edits can change historical costs. Reconciliation and period closing remain future work.
- Consumption replaces purchase grand totals with net issue value. Direct manual material expenses remain additional costs. Purchase basis includes unused/unreceived purchases. Do not separately expense materials already represented by purchases or stock.
- Both bases include earned wages once, direct expenses and allocated overhead. Linked payroll settlements are excluded from cost. Unlinked historical worker expenses remain costs; historical matching is not guessed.
- Cash paid includes purchase payment history, direct expense transactions (including payroll settlements) and attributed overhead. Unpaid wages do not reduce cash. Allocation changes attribution only, not company cash totals.
- Projected profit = contract minus recorded cost. Future costs are excluded. Zero contract has no margin. Customer due compares contract with receipts and may differ from invoices.

## BOQ

Choose one non-cancelled BOQ. Project comparison follows the selected basis. The separately labeled item table remains a purchase-line comparison grouped by material/unit. Discount/transport reconciles separately. Materials-only BOQs are not complete project budgets; positive variance is not final savings.

## Persistence and safeguards

Migration `20261011045124_job_costing_accruals` adds accruals, linked payroll payments and allocations without rewriting existing records. Deploy migrations and regenerate Prisma before restarting the backend. Foreign keys protect linked records. Expense editing shares a source-row lock with allocation creation; concurrent wage payments lock their accrual and cannot exceed the balance. Correct allocated expenses and wage payments through Job Costing.

Basic wage tracking does not include attendance, advances, statutory payroll or approval. Durable reversal audit history, automatic allocation rules and period closing remain outside scope.

Verification: 21 unit/integration tests passed, covering valuation, returns, incomplete history, accrual/settlement reconciliation, concurrent payments, allocation caps and expense protection, plus existing CRM, quotation, billing, payables and stock regression checks.

Frontend production build and focused lint passed. Browser checks confirmed both cost bases, incomplete-history labels and payroll/overhead forms. The existing bundle-size warning remains.
