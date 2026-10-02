# Phase 6 — Client / CRM

The existing Customers and Leads modules remain the client master and sales pipeline. Existing Phase 1–5 and quotation revision work is preserved.

## Use

1. Open Leads, add contact details, source and assigned staff. Search by name, phone, email or company and filter by pipeline stage.
2. Update the stage: New → Contacted → Meeting → Site Visit → Quotation → Negotiation → Won/Lost. Existing Qualified records remain supported.
3. Convert a lead to a customer when a client record is needed for a quotation. Conversion preserves the source and contact details and locks the original lead as Converted. Lost leads must be reopened before conversion. Conversion is distinct from winning a sale and can happen before Won.
4. Create a quotation for the customer. Project selection is now optional. Existing project-linked quotations still require the project to belong to that customer.
5. Add quotation items and payment milestones, then mark the quotation Accepted using the existing quotation editor.
6. Open Customers → View details. An accepted quotation without a project has a Create Project button. The new project inherits the client and quotation grand total as its contract value.
7. Record project income in Transactions. Customer details show linked projects, quotations, receipt history, contract value, outstanding and credit.

Outstanding is the sum of each project's positive contract-value-minus-income balance. Overpayments are shown separately as credit and do not offset another project's due. Project income is the existing receipt source; invoices and invoice-level allocations belong to the later Client Billing phase and are not fabricated here.

Customers with projects, quotations or conversion history cannot be deleted; mark them inactive instead. Customer routes require the existing login token.

## Database and checks

Migration `20261002190000_complete_client_crm` adds customer source, adds pipeline statuses and makes quotation project optional. It backfills source from the earliest linked converted lead. Applied to the configured local MySQL database; no hosted database deployment was performed.

From `server`: `npx prisma migrate deploy`, then `npx prisma generate` for another installation. Restart the backend after updating.

Checks completed: Prisma validation, migration deployment, frontend production build, three unit tests and one local database integration test covering the full API flow. Build reports a bundle-size warning.

ESLint on `src/App.jsx` reports 20 errors and 5 warnings in existing unused-variable and React hook patterns; no undefined-name errors. The overall lint check is not clean. Browser interaction/visual QA was not performed.

Run unit tests: `node --test crm.test.js` from `server`.

Run local integration test in PowerShell: `$env:CRM_INTEGRATION='1'; node --test crm.test.js crm.integration.test.js`. It refuses non-local database hosts, creates uniquely named test records and removes them afterward. Use a development database.
