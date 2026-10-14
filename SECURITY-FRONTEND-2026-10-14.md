# Security and frontend follow-up — 2026-10-14

This completes the dependency and legacy frontend cleanup identified by REVIEW-2026-10-14.md. Direct browser verification remains separately qualified below.

## Dependency changes

- Server: npm audit reports zero advisories after removing nodemon's vulnerable chokidar/braces chain. npm run dev now uses Node's native --watch --watch-preserve-output. The project's current Node 24 runtime supports this; the owned-fixture watch regression verifies restart after a source edit and kills only its own process tree.
- Prisma remains 7.10.0. Scoped overrides use deepmerge-ts 8.0.0 under @prisma/config and mysql2 3.24.6 under prisma. Patched MariaDB 3.5.4 and ExcelJS UUID overrides remain. No Prisma 6/nodemon 1 downgrade or audit suppression is used.
- Client: patched same-range dependencies; Vitest, Testing Library and jsdom added for isolated UI regression. Client npm audit also reports zero advisories.
- Compatibility verified by Prisma validate/generate, all 36 applied migrations, readonly SELECT 1 through prisma db execute and the full backend integration suite. Audit counts are the registry result at verification time, not a guarantee against unknown vulnerabilities.

## Frontend behavior

- Requested navigation and effective allowed page are separate: a disallowed page is never briefly rendered while a state-correction effect runs.
- Startup loaders read current role/project scope without making response state a new reload trigger.
- Page-entry network requests commit state only from response callbacks. Leaving a page, changing account scope or unmounting aborts its requests and ignores late responses. Limit-change handlers fetch once; page effects no longer fetch again for the same limit change.
- Loading indicators start with navigation/refresh events and settle with request completion. Clicking the already-open procurement page no longer leaves its spinner on without starting a request.
- Successful login persists the new session then reloads the page, clearing the previous account's in-memory rows and forms. Failed/empty login does not cache a session.
- Removed unused import, unused state and disconnected old request-item handlers. Replaced short timestamp PO/RFQ suggestions with deterministic PO-RFQ-<RFQ id> and RFQ-PR-<request id> suggestions, avoiding render-time Date.now and rolling timestamp collisions. Existing records are untouched; backend duplicate and approval rules remain authoritative.
- Lint checks the real source and configuration while excluding the existing before/corrupted backup copies. No rule was disabled to hide the App errors.

## Verification

- Full backend: 63 tests passed, zero failures/skips (includes real local-database role/project/approval/accounting checks and native watch restart).
- UI regression: 5 tests passed: restricted-role page fallback, single customer fetch/page-size change, procurement navigation/repeat-click loading, cancellation of stale customer responses, and failed/empty login session handling.
- Client pagination: 1 passed. Total: 69 automated tests.
- npm run lint passes with zero errors/warnings; production build passes. The existing large-bundle warning remains a performance follow-up.
- Server and client npm audit each report zero vulnerabilities.

## Browser boundary

The existing Brave session was briefly readable, then disconnected/timeouts prevented stable automation. The in-app browser opens the real login screen. Creating an additional Viewer account/project assignment specifically for manual browser QA was rejected by automatic approval review because that access grant was not explicitly authorized; it did not execute. The existing account login is the safer alternative, and the user was asked to log in themselves without sending a password. No new user/access grant or financial action was made for that browser attempt. Do not describe live PDF/Excel download or real approval button testing as complete until it is observed after login. Existing API export and approval regressions pass.

After the user logged in, the second in-app tab showed the authenticated Admin dashboard and the Project Profit & Loss page, with ten projects, summary totals, pagination and PDF/Excel controls. The PDF click/download-event check timed out and reset the browser runtime, so live downloads and remaining browser role/approval checks are still unverified. This does not replace the passing automated export/approval tests.

Temporary regression records and 445 verified orphan audit events from this test run were cleaned separately from real history. Existing local backups and credentials are not staged or removed.
