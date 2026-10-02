# Phase 7 — Quotation / Estimation

## Workflow

1. Add a quotation as Draft. Choose a customer; a project is optional before acceptance.
2. Add unit-price or fixed-amount items, with category: Design, Furniture, Civil, Electrical, Lighting, Materials, Labour or Other. Historical items default to Other.
3. Set discount and tax in the quotation editor. Totals use the existing subtotal → discount → tax calculation. Invalid header totals are rejected before saving.
4. Add payment milestones. Changing a percentage fills its amount from the current quotation grand total, rounded to two decimals. Amount remains editable for rounding adjustments. Changing quotation totals later does not silently rewrite existing schedules; update milestones before finalizing.
5. In quotation details, use Mark Sent or Accept. Mark Sent records a status only; it does not email the customer. Sent quotations can be Accepted, Rejected, Expired or Cancelled using the new actions.
6. Sending/accepting requires at least one item, a positive grand total, 100% milestone coverage and an exactly matching milestone amount total.
7. Finalized content remains locked. Create the next revision to change it. Revisions copy items, categories, totals, terms and milestones; older revisions remain visible. Only the latest revision can change status.
8. An accepted quotation without a project can create one from Customer Details. The project uses the quotation total. Older revisions or families already linked to a project cannot create another project. A revised quote does not silently change an existing project's contract value.

## Validation completed

- Prisma schema validated; migration `20261003010000_quotation_item_category` applied to the configured local database; Prisma client regenerated.
- Frontend production build passed (existing bundle-size warning remains).
- Seven automated tests passed, including local database integration for pricing, discount/tax, rejection of invalid saved discounts, category persistence in revisions, milestones, Sent → Accepted, older revision restrictions, project creation and Phase 6 CRM regression.
- Browser checks on the user's local app verified category choices, draft status actions and percentage autofill: 100% of 197,316 produced 197316.00. The temporary UI forms were cancelled without changing stored business records.
- Existing repository-wide lint debt is outside this change; this is not a claim that full lint passes.

## Run

Restart the backend after pulling code and generating Prisma client, then refresh the browser.

For another installation, from `server`: `npx prisma migrate deploy` and `npx prisma generate`.

PowerShell local integration checks from `server`:

```powershell
$env:CRM_INTEGRATION='1'
node --test crm.test.js crm.integration.test.js quotation-workflow.test.js quotation.integration.test.js
```

Tests require a local development database and clean up only their own temporary records. No hosted database migration or website deployment was performed.
