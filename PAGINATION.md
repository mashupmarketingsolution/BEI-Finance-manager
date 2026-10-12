# List pagination

Unpaginated lists now default to 10 entries with 20, 25, 50, 100 and All choices, Previous/Next buttons and an entry range. Existing page-size options remain, with 25 and All added. All uses the current search/filter results.

Coverage includes quotations, BOQs, purchase requests, purchase orders, RFQs, vendor prices, project/customer related lists, quotation items/milestones, billing invoices/payments, vendor statements/history, project costing comparisons and payroll entries. Existing server-paginated lists retain their controls. The dashboard's recent-five preview and the editable purchase-order item form remain previews/forms rather than paginated lists.

`PaginatedTable` paginates already-rendered rows from a complete local list, preserving handlers and row keys. Headers, empty-state rows and calculations remain unchanged. Changing result identities resets the page; changing size also returns to page 1. Summary calculations continue to use the complete dataset outside the table.

Existing API lists accept `limit=-1` for All, normalize page to 1 and return a positive effective limit large enough for the full matching set. Their existing filters and numeric paging remain in place. All may load a large list and is explicitly selected by the user; defaults remain paginated. No database migration is required.

Verification: 22 backend tests, one pagination boundary test, production build and focused component lint passed. Browser checks with 22 temporary projects verified next/previous, All, search reset and the existing server-based All control. Temporary fixtures were removed. Existing bundle-size warning remains.
