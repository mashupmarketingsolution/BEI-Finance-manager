# Account UI and mobile layout

2026-10-15: Permission editor is collapsed by default and loads only when opened. Closing it unmounts the fields and discards unsaved edits. Password forms show the selected username, validate the bcrypt byte limit and have explicit labels and touch-sized controls.

Phone layout: sidebar starts closed, opens over content with a dismiss backdrop, and closes when a navigation item is chosen. Main content keeps independent scrolling. Account/billing forms use a single column, readable inputs and horizontally scrolling tables. Desktop navigation remains in the flex layout.

Verification: 14 session/permission UI tests passed and production build passed. Password backend tests passed in the preceding phase. Local database migration still fails with a schema engine connection error, so database end-to-end verification is pending. These latest password/mobile changes have not been deployed live. Full visual coverage of every ERP section on phones remains pending.

2026-10-15 follow-up: removed duplicate sidebar Change password button; one styled action remains. Role guide is collapsed so accounts appear higher on the page, Admin accounts sort first and role/password actions share the user row. Page permissions remain collapsed below. Read-only local DB review confirmed only Admin existed. At owner request, recovered missing mahmud / VIEWER from verified pre-reset local backup; retained current Admin, password hash and business data unchanged. Recovery retained the old Mahmud password and invalidated prior tokens using a new passwordVersion. No projects were assigned automatically. Reviewed local backup contained no Accounts/Manager/Storekeeper accounts. Private pre-recovery user snapshot is excluded from Git.
