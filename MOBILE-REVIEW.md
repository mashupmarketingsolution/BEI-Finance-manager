# Mobile responsive review — 2026-10-15

Browser checks on local authenticated Admin session: 390px width across User Access, Projects, Documents, Client Billing, Project Profit & Loss, Vendor Payables, Quotations, Income, Expenses, Workers, Purchases, Stock Desk and Backups. Main scroll width did not exceed its client width.

320px checks: Dashboard, Site Reports, Leads, Customers, BOQ, Transactions, Vendors, Materials, Purchase Requests, RFQ, Purchase Orders, Categories, Approvals, Procurement Review, Payment Requests, Financial Requests, Audit Log and User Access. Materials pagination initially overflowed to 337px in a 320px viewport. Added wrapping and touch-sized pagination controls; recheck main scroll/client width both 320px. New User form inputs fit within the form at 320px. No form submissions or account changes made. Phone drawer starts closed after reload and closes when choosing a page. Browser viewport reset after testing.

Limits: local business lists mostly empty; this is not complete real-device testing, every modal, populated long-text row, file upload or on-screen keyboard coverage. No claim that every ERP interaction is fully mobile verified. Latest pagination fix is local only until deployed.
