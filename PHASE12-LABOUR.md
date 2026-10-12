# Phase 12: Attendance and wage rates

Open **Workers** and scroll to **Attendance & Wage Rates**.

1. **Set wage rate:** choose worker/project, effective date, daily wage and overtime hourly wage. Add a new dated rate for a wage change. Rates are project-specific.
2. **Record attendance:** choose worker/project/date and Full day, Half day or Absent. Enter overtime when applicable. The latest rate effective on that work date is copied into the attendance record.
3. **Attendance history:** filter by worker, project and dates. Tables support page sizes and All. Totals follow the complete filtered set, not just the visible page.
4. **Generate payroll:** posts that attendance's saved wages once into existing PayrollAccrual. Pay or reverse wage payments under Project Profit & Loss → Payroll & overhead entries. Return to Workers to undo the generated accrual if correcting attendance; paid accruals require reversing all payments first. Then remove/re-enter attendance.

## Rules

- One attendance record per worker/date across all projects. Split-project shifts, hourly-only days and multiple shifts are not implemented.
- Full day = one daily wage; half day = half; absent = zero. Overtime adds hours × hourly wage. Total reference time (day units × 8 + overtime) cannot exceed 24 hours. Eight hours here is a validation reference, not an attendance clock or statutory overtime policy.
- Overtime requires a positive configured hourly rate. Absent days cannot have overtime. Attendance cannot be dated in the future; future effective wage rates are allowed.
- Money is rounded once to cents after calculating the day's wages. Daily rates must be positive; overtime rates can be zero when no overtime is expected.
- Existing attendance keeps its saved rates and amount when wage rates are changed or removed. Correct the attendance explicitly if its saved rate was wrong.
- Attendance alone is a wage preview; it does not affect project costs/cash. Generate payroll to recognize unpaid labour cost. Settlement then reduces cash and unpaid balance without adding labour cost again.
- Do not generate payroll for wages already recorded manually as expenses/accruals. Historical matching is not inferred.
- Worker/date uniqueness and locked attendance records prevent duplicate attendance and concurrent duplicate payroll posting. Foreign keys protect linked payroll/worker/project history.

## Delivery and remaining scope

Migration `20261012070000_worker_attendance_rates` adds worker_rates and worker_attendance, plus an optional attendance-to-payroll link. No existing business data is rewritten. On a normal deployment run Prisma migrate deploy and generate, then restart the backend. On this local Windows run the Prisma migration engine failed to spawn; the exact committed SQL was applied through the existing database adapter and its SHA-256 checksum/success recorded in _prisma_migrations. Prisma validation and client generation succeeded.

Worker advances, advance settlement and consolidated statements are now implemented below. Pay-period batches, approval, refunds, shift-based attendance and durable correction audit history remain for later Phase 12 work. This does not claim full payroll completion.

Verification: 24 backend unit/integration tests passed, including half-day rounding, overtime validation, missing-rate rejection, effective-rate snapshots, concurrent duplicate attendance/payroll, absent-day handling, linked deletion, project cost/cash reconciliation, payment reversal and earlier workflow regressions. Production build and Labour component lint passed. Browser checks confirmed the Workers attendance/rate section and form controls. The existing bundle-size warning remains.

## Worker advances and statements

Open **Workers → Worker Advance & Statement**.

1. **Record worker advance** records money already given, with worker, project, unique reference, date, amount and method. It creates one managed WORKER_ADVANCE cash transaction. Do not duplicate it in Expenses. Advance dates cannot be in the future.
2. **Worker statement** opens earned payroll, cash wage payments, advance history, applied/unused advance, unpaid wages and separate unlinked worker expenses. Filter by project or search worker. Balances are lifetime totals for recorded payroll; unposted attendance remains a preview.
3. **Apply to wages** allocates all/part of available advance to existing unpaid payroll for the same worker and project. No new cash transaction or labour cost is created. One active allocation per advance/payroll pair; undo an allocation first when correcting its amount. Allocation dates cannot precede either record or be in the future.
4. **Undo allocation** restores unused advance and wage due without changing cash. **Reverse entry** is for correcting a mistaken advance entry after removing all its allocations. It removes the generated cash transaction and retains the advance reference, original details and reversed timestamp. It is not a record of an actual refund. Actual refunds/recoveries remain future work.

### Reconciliation and safeguards

- Earned labour cost comes from payroll accruals. Advance cash is excluded from project labour cost until wages are earned; the wage accrual is then counted once.
- Wage due = recorded earned wages − cash wage payments − applied advances.
- Unused advance = active advance amount − allocations. Wage due and unused advance stay separate, including across project filters; they are not silently netted across projects.
- Project/company cash paid includes the advance when given plus later cash wage payments. Applying or undoing an allocation changes no cash balance. Project Profit & Loss includes allocations when calculating unpaid payroll; its payment form shows Settled amounts and allocation references.
- Legacy/manual worker expenses remain unchanged, separate from payroll balances. No historical wage/advance relationship is inferred.
- Accrual locks are shared by cash payment and advance allocation; advance locks enforce remaining balances. Concurrent payment/allocation cannot over-settle wages. Duplicate references roll back the associated cash transaction. Linked allocations protect payroll deletion/attendance undo; active advance transactions are protected from generic income/expense/transaction editing and deletion.
- Reversed advances remain visible. Allocation undo follows the existing correction model and does not retain an allocation audit trail; full actor/action auditing belongs to the later audit phase.

Migration `20261012080000_worker_advances` adds managed advance and allocation tables and a WORKER_ADVANCE transaction source. The Windows migration engine still could not spawn locally; the exact SQL was applied via the existing database adapter and checksum/success saved in Prisma migration history. Schema validation and client generation passed. Normal deployments use migrate deploy/generate and restart as usual.

Verification for this extension: 26 backend tests passed, including isolated cash/cost accounting, project/worker restrictions, allocation/payment caps, concurrent allocation-versus-cash-payment, duplicate rollback, statement filtering, protected records and reversal. Production build and focused component lint passed. Browser checks confirmed the new form and reconciled an existing worker's earned wages/payment history.
