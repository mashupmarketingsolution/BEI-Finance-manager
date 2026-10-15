# Account UI and mobile layout

2026-10-15: Permission editor is collapsed by default and loads only when opened. Closing it unmounts the fields and discards unsaved edits. Password forms show the selected username, validate the bcrypt byte limit and have explicit labels and touch-sized controls.

Phone layout: sidebar starts closed, opens over content with a dismiss backdrop, and closes when a navigation item is chosen. Main content keeps independent scrolling. Account/billing forms use a single column, readable inputs and horizontally scrolling tables. Desktop navigation remains in the flex layout.

Verification: 14 session/permission UI tests passed and production build passed. Password backend tests passed in the preceding phase. Local database migration still fails with a schema engine connection error, so database end-to-end verification is pending. These latest password/mobile changes have not been deployed live. Full visual coverage of every ERP section on phones remains pending.
