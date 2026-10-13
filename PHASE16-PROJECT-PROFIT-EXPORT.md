# Project Profit & Loss — PDF / Excel exports (Phase 16 first report)

The Project Profit & Loss page now offers Export PDF / Export Excel for all matching projects across pagination. The Details panel offers Project PDF / Project Excel for one selected project. Both use the selected material basis and lifetime recorded activity. Summary exports follow the current project/customer search; selected-project exports follow that project independently of search.

## Data and access

Exports use the same loadProjectProfit calculation as the existing JSON report. The export takes a repeatable-read transaction to produce a consistent snapshot of project activity, receipts, purchases, stock valuation, earned wages and overhead. Project Profit & Loss access applies to Admin, Accounts, Project Manager and Viewer. Project Manager and Viewer exports are restricted to live assigned projects; other roles cannot call the export API. Shared stock receipts are read only for internal valuation and never exported as other projects' rows.

Endpoint: GET /api/reports/project-profit/export?format=pdf|xlsx&basis=consumption|purchase&search=...&projectId=...

Invalid format/basis/search or project IDs return 400. An inaccessible/missing selected project returns 404. Empty searches produce a labelled empty report; exports exceeding 1,000 projects require a narrower filter. Downloads require authentication and have attachment, no-store and nosniff headers. Export performs no financial posting or account/permission changes.

## Contents

PDF: landscape A4, repeated table headers, page numbers, generated Bangladesh timestamp, BDT currency, basis and filters. Summary financial performance, cash/customer balances and matching totals. Selected-project PDF adds cost groups, stock consumption, manual expense categories, separate BOQ-versus-purchase item comparisons and bill-adjustment notes. Noto Sans Bengali is embedded for Bengali/Latin names, with its SIL OFL license included.

Excel: Overview, Projects, Cost Breakdown, Stock Consumption, Manual Expenses and BOQ Purchase Comparison. Values are numeric snapshots (including signed losses and null zero-contract margins), formatted as BDT/percent; text remains string data, including names beginning with =. Frozen headers, filters, column widths and wrapped rows are supplied. The workbook is a report snapshot, not an editable forecast model. Different BOQ estimates are not consolidated as one budget; BOQ items remain purchase comparisons even under consumption basis.

Both exports label incomplete stock history as provisional, exclude future costs, distinguish unpaid wages from cash paid, and explain contract-based customer due versus invoice balances. They do not implement full accounting statements or date-period profit attribution.

## Verification

CRM_INTEGRATION=1 node --test --test-concurrency=1 project-profit-export.test.js project-profit.test.js project-access.test.js job-costing.test.js

Tests reopen XLSX output and check numeric values, margin/stock status, formula-like customer names as strings, detail sheets, search, cost basis, authentication, role restrictions, assigned-project boundaries, Viewer downloads and empty reports. PDF tests cover Bengali/long names and multi-page/empty output. Generated test PDFs were independently rendered with PDFium and all pages visually inspected; the workbook was independently reopened with openpyxl. Client build and focused lint pass. Browser UI checking was attempted, but the browser connection timed out; no claim of a successful live button test.

Export dependencies: exceljs and pdfkit. ExcelJS's UUID dependency is overridden to the patched 11.1.1-compatible range and export/readback is tested. npm audit still reports 13 advisories in pre-existing server dependencies; existing package versions were not changed in this feature. Those need a separate dependency maintenance review rather than a forced major downgrade.

Local verification fixtures live only in the OS temporary directory, and temporary database accounts/projects are cleaned up. No real financial records were altered.
