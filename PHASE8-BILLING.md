# Phase 8 — Client Billing / Accounts Receivable

Completed Phase 7 was committed at `7533318` before Phase 8 began. Old backup copies remain untouched and are not included in feature commits.

## Use Client Billing

1. Open **Client Billing → Create Invoice**.
2. Enter a unique invoice number and choose a project/customer. Choose a payment milestone from an accepted quotation to fill its description and gross amount, or enter a custom amount.
3. Set invoice and due dates, then **Save Draft**. A draft reserves its invoice number/milestone but is excluded from invoiced/receivable totals.
4. Open the draft and **Issue Invoice**. Issued invoices for a project cannot exceed its contract value.
5. **Record Payment** adds a new project Income transaction and an invoice payment atomically. Partial payments are supported; the amount cannot exceed the invoice balance.
6. If the money is already recorded under Income, use **Link Existing Receipt** instead. This allocates the existing receipt without adding income again. A receipt belongs to one invoice in this phase; splitting one receipt across multiple invoices is not supported.
7. View paid, partial, unpaid, overdue and void invoices using filters. Dashboard totals cover issued invoices only. Overdue is based on the due date in Bangladesh time.

For Hossain / project Hossain - 090: after creating and issuing the invoice, link the existing 1,000 and 2,000 income receipts. Do not record these amounts again. The project has received 3,000 already; allocating those receipts makes the invoice show the same paid amount.

## Corrections and integrity

- Draft and issued invoices with no payments can be voided. The void document remains in history. Correct a draft by voiding and creating a replacement; invoice numbers remain unique.
- **Reverse Payment** removes a payment created in Billing together with its generated Income entry.
- **Unlink Receipt** removes only the invoice allocation and leaves the original Income entry intact.
- Income/Transaction editors reject edits or deletion of allocated receipts. Correct those through Client Billing first.
- Projects with invoice history cannot be deleted/reassigned; contract value cannot be reduced below issued invoice totals.
- Customer Details includes invoice balances separately from the existing project financial summary. Project outstanding is contract value minus all project income; invoice outstanding is issued invoice value minus allocated invoice payments. These can differ until old receipts are allocated or the project is fully invoiced.
- Quotation amounts are gross amounts including the quotation's discounts/tax; invoice creation does not apply tax again. This phase implements receivables, not a full tax-invoice/PDF template or general ledger.

## Verification and operation

- Prisma schema validated and migration `20261003020000_client_billing` applied to local MySQL. Existing customer/project/receipt records were preserved.
- Ten unit/integration tests passed, including payment lifecycle, rollback after overpayment, duplicate receipt rejection, linked receipt protections, project invoice limits, reversal/unlinking and CRM/quotation regression.
- Frontend production build and focused lint on the new Billing component passed. Existing App.jsx lint debt and bundle-size warning remain outside this phase.
- Browser verified Billing loads and accepted milestone selection fills amount/description. No live business invoice/payment was created during browser QA.
- Local backend was restarted on port 5000 with the updated code. Server logs are local ignored `.log` files. No hosted deployment was made.

From `server`, PowerShell test command:

```powershell
$env:CRM_INTEGRATION='1'
node --test crm.test.js crm.integration.test.js quotation-workflow.test.js quotation.integration.test.js billing.test.js billing.integration.test.js
```

Integration tests refuse non-local hosts and delete only their own temporary records. For another installation run `npx prisma migrate deploy`, `npx prisma generate` and restart the backend.
