# Phase 17: User Roles and Permissions

Implemented 2026-10-12. Role permissions apply across the company; project-specific access assignments remain separate. Inspection approval is now covered in PHASE15-INSPECTION-APPROVAL.md.

## Roles

| Role | View | Change |
|---|---|---|
| Admin | Current business pages and User Access | All current business functions and existing user access |
| Accounts | Financial dashboard, billing, payables, Payment Requests, Financial Requests, project profit, income, expenses, transactions, workers and categories | Can submit/post approved vendor payments, wage settlements and ordinary expenses; cannot approve them or reverse new approval-managed entries. Earned payroll, workers and job costs retain their workflows. Other operational pages denied. Minimal project/vendor lookups support forms without exposing those pages |
| Project Manager | Projects, site work, CRM, estimates, procurement, Procurement Review, workers, stock, project profit and Approvals | Operational work and independent inspection/PR/PO review; company cash-ledger/dashboard pages and payroll posting denied |
| Site Supervisor | Reports, photos, tasks, inspections and minimal project lookups | Site reports/photos, tasks and inspections |
| Procurement Officer | Vendors, materials/prices, requests, RFQs, purchase orders, purchases, Procurement Review and Stock Desk quantities; minimal project/category lookups | Vendor/material/price records and procurement submission; no approval decisions, stock changes, payments, payroll or ordinary record deletion |
| Storekeeper | Stock Desk quantities, pending receipt items and stock history | Existing purchase receiving, project issues and returns only; no costs/prices, payments, master-record edits, damage or stock adjustments |
| Viewer / Auditor | Project profit, Site Reports and Stock Desk only | No changes; company income/expense/transaction pages, payroll and user access denied |

Project Manager cannot delete ordinary business records. Site photo removal and attendance removal retain their existing guarded workflows. Payroll batch preview is a read operation despite using POST and is allowed to Project Manager; posting/reversing a batch is not. Purchase payment routes use financial permissions even though they sit under the purchases URL. Purchase accrual creation is operational; settlement is financial.

Site Supervisor cannot use financial, procurement, CRM, master-worker, payroll or user-list APIs. Project lookups expose only id/name/status. Daily report details expose attendance names/day units/overtime, but not wages or cash/purchase totals. Encoded IDs and trailing-slash detail URLs receive the same redaction. Site photo access still requires login and the site permission. All site records are visible company-wide, regardless of assigned inspector/person.

## Admin management and rollout

Open User Access to view accounts, use Add User to create an account, or edit another user's role/status. Add User asks for name, username, matching password/confirmation and role. Username is normalized to lowercase and must contain 3–50 ASCII letters/numbers/dots/hyphens/underscores, beginning with a letter or number. Password requires at least eight characters and at most 72 UTF-8 bytes; bcrypt hashes use cost 12. New accounts start Active and default to Site Supervisor unless Admin selects another role. The creator stays logged in as themselves; the new user signs in with their own username/password. Passwords and hashes are not included in list/create responses or stored by this form in localStorage. Cancel and successful submission clear the password fields.

Creation requires an active Admin, rechecked inside a transaction after hashing. Duplicate usernames are rejected by the database's unique index, including concurrent requests and case variants. Client-supplied passwordHash, status and unrelated fields cannot override the creation whitelist. This does not reset existing passwords, invite users or send notifications. User data excludes password hashes.

Migration `20261012130000_user_roles` preserves the unrestricted access existing users already held by assigning Admin during rollout. New database users default to Site Supervisor; existing business records and credentials are unchanged. No real user's role was downgraded in testing. Review existing accounts and assign the appropriate role through the page when needed.

Self-removal of active Admin access is blocked. User management locks user rows, rechecks the acting Admin and preserves at least one active Admin. Version checks reject stale/concurrent updates. Updates do not grant access based on a JWT role claim: every request loads the current active user and role from the database. Inactivation blocks the existing token on its next request. An already-authorized in-flight business request may finish; this is not cancellation of running operations.

## Client and server enforcement

The global authorization middleware runs before all business route handlers. Unknown resources and invalid roles are denied; nested procurement/item/payment aliases are classified explicitly. Login and health remain public. Permission information is returned by login and auth/me. It is presentation data, not the server's source of authority.

The sidebar filters allowed pages, disallowed pages do not render, and legacy mutation controls/forms receive a view-only guard while filters, viewing and pagination remain available. The server independently rejects unauthorized requests even if client controls or stored permissions are modified. Mixed worker pages keep Project Manager attendance available while blocking rate/payroll/advance controls. User access is refreshed on focus, every minute, and following a permission denial. Existing tokens continue to work within the newly selected role.

## Verification

Prisma validation, migrate deploy and client generation succeeded. The production frontend build and focused lint for AccessUI, UserAccess and SiteReports passed. All 36 backend unit/integration tests passed. Coverage includes the existing API route inventory, role reads/writes, nested aliases, direct forbidden requests, ignored JWT role claims, new-user default, supervisor financial redaction (including URL variants), live token restriction, inactive-user rejection, private user fields, stale/concurrent access changes and protected own Admin access. Existing integration fixtures explicitly use Admin to continue testing full workflows; temporary test users and business fixtures were removed.

Browser verification confirmed the current user's Admin menu, User Access list and own-access protection without changing real user permissions. Restricted-role access was verified through integration tests, not by replacing the user's browser login. The existing bundle-size warning remains. Full actor/action audit history, project-scoped permissions, password reset/change UI and multi-step approvals are not included in this increment.

## Add User verification

The subsequent Add User increment passed the full 38-test backend suite, frontend build and focused UserAccess lint. Dedicated tests cover validation, bcrypt password comparison, all four roles, working login, rejected wrong passwords, anonymous/non-Admin creation denial, duplicate/concurrent usernames and private response fields. Temporary accounts were removed. Browser checks confirmed Add User, masked password/confirmation inputs, role choices and Cancel without entering real credentials or creating a real account. No database migration was needed for this increment.

## Specialized roles and Stock Desk

The current page whitelist supersedes the broad read permissions of the initial rollout. Only Admin has every page. The User Access page displays the authoritative visible page list for all seven roles. Accounts no longer opens site/procurement pages; Project Manager no longer opens company cash/billing/payables/dashboard pages; Viewer is limited to the three report areas in the table above. Role-specific lookup APIs may serve required dropdown values without granting the corresponding full page. User role assignments are unchanged, and live tokens use the revised server policy on the next request. Approval Inbox is limited to Admin/Project Manager. Inspection creators, inspectors and submitters cannot review their own inspection.

Added Procurement Officer, Storekeeper and Viewer/Auditor with migration `20261012140000_extra_user_roles`. The migration extends the role enum; it does not change existing assignments or the Site Supervisor default. Add User and Edit user access offer all seven roles. No real account was reassigned during testing.

Stock Desk provides quantity balances and paginated/searchable movement history, a pending-purchase receiving form, and project issue/return forms. Admin and Project Manager can manage its entries; Storekeeper uses this page as their only main page. Procurement Officer and Viewer can view the desk but cannot submit its stock actions; Accounts no longer has this page. Existing locked stock APIs continue enforcing remaining receipt quantities, available stock and maximum project returns. No new stock movement or cash calculation rules were introduced. Receipt quantities display to three decimal places.

The Stock Desk API selects only material/project identifiers, names, units, quantities, pending receipt items and movement dates/types. Storekeeper cannot use full purchase/material/project-detail APIs, billing, payroll or user management. Stock receipt and movement write responses are also whitelisted to omit prices, unit costs, contracts and nested financial records. Procurement Officer may view purchase/material prices for their work, but cannot receive stock or access payment APIs, financial dashboards, cash ledgers or payroll. Viewer can read project profit reports and site/stock records, but cannot change them or open company cash-ledger/payroll pages.

The full 40-test suite, production build and focused StockDesk/AccessUI/UserAccess lint passed. Tests include login for all seven roles, nested procurement aliases, company financial restrictions, warehouse receipt/issue/return, insufficient-stock/excess-return guards, redacted read and write responses, Viewer mutation rejection and live role changes. Temporary stock and account fixtures were removed. Browser checks confirmed seven role choices, Stock Desk quantities/history and receipt fields without creating real accounts or stock movements. Restricted-role behavior was verified by API integration tests. Existing bundle-size warning remains; project-specific permissions, approval steps and durable action audit remain separate work.
