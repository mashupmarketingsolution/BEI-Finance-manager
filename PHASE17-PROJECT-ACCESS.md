# Assigned Project Access

Implemented 2026-10-13 following the selected policy: Project Manager, Site Supervisor and Viewer/Auditor can access assigned project records only. Admin has all projects. Accounts, Procurement Officer and Storekeeper retain their existing role-specific company access and financial redaction.

## Admin setup

Open **User Access → Edit user access**. For a scoped role, select Assigned projects and save. Add User offers the same selection. No projects selected means no project records. The migration creates an empty membership table; no existing user receives automatic assignments and no real user assignment was changed by the agent. Existing scoped users need Admin to select their projects before using project records. New projects are created by Admin and then assigned.

Assignments are loaded from the database on each request; JWT project/role claims do not grant access. Saving role/status/projects uses the existing access version and Admin checks. Missing or duplicate project IDs are rejected. Role or project changes trigger frontend access refresh and reload to clear old forms/data. Requests already in progress use their authenticated request context.

## Enforcement and shared data

The server scopes Prisma project queries, counts, aggregates, child records and nested relation lists. Direct document IDs, edits, creates and parent/foreign links must belong to assigned projects. Customer history calculates from the visible project list; reports return assigned projects only. Inspection and procurement approval still require their independent reviewer rules. Department/company APIs remain blocked by the role policy.

Shared customer/lead/worker/vendor/material/category masters remain available where the role permits; this increment does not make those company master records private to individual users. Central warehouse quantity balances remain shared and correctly account for all movements, while other projects' movement details are filtered. Stock-consumption reports use shared receipt history internally to value stock correctly, returning only assigned project results. General overhead linked to an assigned project remains usable for its costing.

Interactive transactions carry the same project context for validation/queries. The scope layer enriches Prisma 7's reduced runtime relation metadata from the versioned schema; that schema must remain packaged with the server. Fixed internal raw locks are followed by scoped model lookups; shared valuation reads deliberately use an internal company-read context. Future APIs/raw SQL and new descendant models must preserve this boundary and receive scope tests. No client-side filter or hidden menu is treated as authorization.

## Verification

The full 54-test suite passed. New tests cover no assignment, forged JWT projects, parent/detail access, nested customer financial history, site reports/tasks, denied cross-project writes, project creation restriction, live assignment replacement/removal, duplicate selections and unchanged Accounts/Procurement/Storekeeper access. Existing restricted-role fixtures explicitly assign only temporary fixture projects. No real project grant was made. Temporary accounts/business data and verified test audit entries were removed.

Prisma validation/migration/generation, production build, focused UserAccess/AccessUI lint and syntax/diff checks passed. Browser verification is read-only; actual assignments are for the human Admin to select. Existing bundle-size warning remains.
