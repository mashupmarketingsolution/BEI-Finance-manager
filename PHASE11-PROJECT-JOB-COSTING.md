# Phase 11 (partial): Project job costing / profit report

Numbering corrected to the original roadmap. This report was previously mislabeled Phase 10. Phase 10 is Full Accounting and remains unimplemented.

Open **Project Profit & Loss**. Search by project/customer; the summary follows the search. Details break down purchases, worker-linked expenses, other expenses, vendor payments and balances. Values cover the full lifetime of each project.

## Calculation rules

- Projected profit/loss = contract value minus recorded purchases and other expenses. This is not recognized revenue or final profit; future costs are not included.
- Purchase cost comes from purchase grand totals. PURCHASE mirror transactions and PURCHASE_PAYMENT settlements are excluded from cost to prevent double counting.
- Worker cost uses manual expenses with a worker link. All other non-purchase expenses appear as other cost.
- Received = all project income, including existing receipts and invoice payments. Invoice totals are not added again.
- Cash paid = purchase payment history plus non-purchase expenses. Legacy and linked purchase payments are counted once from payment history.
- Customer due/credit compares contract value and receipts. Vendor due is calculated per purchase from payments. Customer due may differ from issued invoice balances.
- Unassigned activity is excluded. General overhead is not allocated. Manual expenses are treated as paid entries; unpaid labour obligations are not tracked by this report.

No migration or changes to financial records are required. Existing project details remain unchanged.
