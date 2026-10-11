# Phase 11: Purchase-based project job costing / profit report

Numbering corrected to the original roadmap. This report was previously mislabeled Phase 10. Phase 10 is Full Accounting and remains unimplemented.

Open **Project Profit & Loss**. Search by project/customer; the summary follows the search. Details break down purchases, worker-linked expenses, other expenses, vendor payments and balances. Values cover the full lifetime of each project.

## Calculation rules

- Projected profit/loss = contract value minus recorded purchases and other expenses. This is not recognized revenue or final profit; future costs are not included.
- Purchase cost comes from purchase grand totals. PURCHASE mirror transactions and PURCHASE_PAYMENT settlements are excluded from cost to prevent double counting.
- Detailed cost groups separate net purchase materials, transport, labour, design, other vendor expenses and other expenses. Purchase transport is separated from the grand total; discount reduces material cost. Exact normalized category names identify manual materials, transport, design and labour; worker links provide a labour fallback, vendor links a vendor-expense fallback. The category table makes these classifications visible.
- Received = all project income, including existing receipts and invoice payments. Invoice totals are not added again.
- Cash paid = purchase payment history plus non-purchase expenses. Legacy and linked purchase payments are counted once from payment history.
- Customer due/credit compares contract value and receipts. Vendor due is calculated per purchase from payments. Customer due may differ from issued invoice balances.
- Unassigned activity is excluded. General overhead is not allocated. Manual expenses are treated as paid entries; unpaid labour obligations are not tracked by this report.

No migration or changes to financial records are required. Existing project details remain unchanged.

## BOQ comparison and margin

Open a project's Details and choose one non-cancelled BOQ. No BOQ is silently selected or added to another; draft estimates are marked. Compare the selected estimate with total recorded project cost, or compare material rows by material ID and unit. Rows aggregate repeated items within the chosen BOQ; purchases not in that BOQ are flagged. Quantity uses three decimal places and money is accumulated in cents.

Material actual cost is purchased line cost, not consumed inventory value. Purchase discounts and transport remain a separate bill adjustment and reconcile line totals to purchase cost. Manual expenses are additional costs and are not allocated to material rows. A materials-only BOQ is not a complete project budget; the UI explicitly distinguishes these scopes. Positive variance is remaining estimate to date, not guaranteed savings.

Profit margin = (contract value − recorded cost) / contract value × 100. A zero contract value shows no margin rather than infinity. Costs yet to be recorded, accrued payroll and overhead allocation are still outside scope.

Verification: five report tests passed, including mixed cost-group reconciliation, separate BOQs/units, unbudgeted purchases, negative bill adjustments, zero-contract margin and a local database BOQ fixture. Frontend build and targeted lint passed. Existing bundle-size warning remains.
