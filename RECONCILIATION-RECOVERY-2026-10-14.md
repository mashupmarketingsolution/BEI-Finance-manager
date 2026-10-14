# Source reconciliation and recovery drill — 2026-10-14

The previous phase was committed as `514f832` before this work. This review did not edit financial or stock records. Existing untracked backups were preserved.

## Reconciliation findings

Read-only repeatable-read checks examined 10 purchases, 2 client invoices, 1 payroll accrual, 28 stock movements and all existing overhead allocations (none).

### Vendor history requires evidence

These stored paid amounts have no corresponding PurchasePayment history. Do not assume either the stored field or the missing history proves the real amount paid.

| Purchase ID | Stored paid | Payment history | Stored due | Due derived from history |
|---|---:|---:|---:|---:|
| 2 | 20,000 | 0 | 7,500 | 27,500 |
| 3 | 400,000 | 0 | 260,000 | 660,000 |
| 4 | 9,450 | 0 | 0 | 9,450 |
| 5 | 34,000 | 0 | 5,500 | 39,500 |
| 16 | 58,000 | 0 | 0 | 58,000 |
| 17 | 500 | 0 | 2,020 | 2,520 |
| 34 | 10,000 | 0 | 48,000 | 58,000 |

Total unresolved stored paid amount: **৳531,950**. Across all purchases, stored paid totals ৳566,950 while payment history totals ৳35,000. Payables currently derives due from payment history, so it shows ৳866,190; stored due fields total ৳334,240. This difference must be reconciled with vouchers/bank/cash records before any backfill or correction. Posting these amounts as new payments without checking existing cash transactions could double-count cash.

Purchase 1 has payment history of ৳10,000 and ৳25,000, consistent with its stored total paid ৳35,000. Both are historical payments without verified transaction links; automatic reversal should remain unavailable.

Purchase subtotal/discount/transport arithmetic matched the stored bill totals in the examined records.

### Stock cost remains provisional

- Movement **10** issues **12 Sheet of MDF Board 18mm (material 1)** to **Munshigonj (project 4)** at 2026-08-24 12:20:49 UTC before any recorded receipt for that material/unit. The first recorded receipt is movement **25**, 20 Sheet at 2026-08-24 16:19:45 UTC. A source receipt date correction or a priced opening balance may explain the gap, but neither can be inferred safely.
- Subsequent MDF damage/negative adjustments **17 and 19** occur while chronological stock is already negative.
- Project usage/return movements **7, 11, 15 and 16** have no project assignment. Source issue/return slips are needed to identify the correct project; do not assign them to Munshigonj merely to clear a warning.
- Positive stock adjustments **13, 18, 20 and 21** have no unit cost. They require documented valuation to make stock costing complete.
- Preserve the existing incomplete-cost warning. Later receipts do not establish the historical cost of earlier unrecorded stock.

### Matched checks and limits

- Both invoice ledgers passed receipt amount/type/project checks, with no overpayment. Hossain invoice 5 has ৳303,600 billed, ৳3,000 linked receipts and ৳300,600 due; invoice 18 is ৳1,000 unpaid.
- Payroll accrual 7: ৳1,800 earned and ৳1,800 settled (৳1,000 + ৳800), no over-settlement or transaction/project/worker mismatch.
- No overhead allocations exist, so there is no actual overhead allocation history to reconcile.
- These are internal database consistency checks, not verification against bank statements, vouchers or physical stock. Actual profit cannot be finalized until the stock gaps are resolved.

## Backup/restore result

`server/backup-verify.js` successfully made a local SQL backup and restored it into a uniquely generated, isolated database. Source and restored schema and full row-content hashes matched for **54 tables / 262 rows**. Binary file contents (documents/photos stored in database) are included in the row hashes. The source snapshot before and after matched; only the generated test database was dropped.

Private backup and hash manifest are retained under the Git-ignored folder:

`server/local-backups/bei_restore_verify_1791957815339_96e35b27/`

The manifest contains the SQL SHA-256, per-table schema/data hashes and row counts. SQL contains confidential application data and must not be committed or shared publicly. This local copy does not protect against loss of the PC/disk; an owner-controlled off-device copy remains a separate operational step. Environment files/secrets are not included; recovery also needs the matching application code and separately protected configuration.

## Repeatable tools

From the server folder:

- `node reconcile.js`: read-only source checks; findings do not mutate data.
- `node backup-verify.js`: local-only backup and isolated restore drill. Requires XAMPP mysql/mysqldump utilities, or `MYSQL_BIN_DIR` pointing to their directory. Credentials are passed privately via child environment, never command-line arguments or logs.
- `node --test reconcile.test.js backup-verify.test.js`: four passing regression checks.

The restore tool refuses remote sources and non-table objects requiring separate review (views, routines, triggers or events). It compares all rows, not just table counts. A source change during the drill makes verification fail. It can clean up only its own generated target with a strict name guard, and cannot select an arbitrary restore destination. It retains backup files on failure.

## Required source information before correction

1. For purchases 2, 3, 4, 5, 16, 17 and 34: confirm actual paid amounts, payment dates/methods/references, and whether each is already represented by a cash/bank transaction.
2. For MDF: confirm the opening quantity/cost/date or the correct receipt timestamp, using original stock/purchase documents.
3. Identify projects for the unassigned usage/returns and costs for the unpriced positive adjustments.

No payment, stock valuation or balance was invented to make the report appear complete.
