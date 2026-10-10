# Phase 9: Vendor Payables

Purchase records serve as supplier bills. Open **Vendor Payables**, choose a vendor's **Statement**, then **View Bill**.

- Save an optional supplier bill number and due date. Bill numbers must be unique within a vendor.
- Use **Record Vendor Payment** for a new payment. Partial payments reduce the outstanding balance; payments above the balance are rejected.
- Filter bills by unpaid, partial, paid or overdue status. Statements include payment history and the last payment.
- **Reverse Payment** removes a newly linked payment and its cash transaction together, then recalculates the bill balance.
- Historical payments remain included in balances. Payments without a verified transaction link are read-only and cannot be automatically reversed. No historical transaction links are guessed.

The existing Purchases payment form uses the same transactional endpoint. Payment settlement does not add the purchase cost a second time. General transaction/expense editing cannot change purchase-managed transactions. Purchases with payments cannot be edited or deleted until their linked payments have been reversed.

## Delivery and verification

The additive `20261003030000_vendor_payables` migration adds supplier bill metadata and an optional unique payment-to-transaction link. It has been applied to the local development database; hosted deployment is not included.

Verification on 2026-10-11:

- All 12 CRM, quotation, client billing and vendor payables unit/integration tests passed against the local test database workflow. Integration fixtures are cleaned up.
- Tests cover concurrent overpayment prevention, bill number uniqueness, protected edits, reversal, full settlement and historical payment preservation.
- Client production build and targeted Payables lint passed. The existing large-bundle build warning remains.

This phase uses purchases as bills; it does not introduce separate non-purchase vendor invoices or automatic reconciliation of historical expenses.
