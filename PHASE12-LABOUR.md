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

Worker advances, advance settlement, consolidated worker statements, pay-period batches, approval and durable correction audit history remain for later Phase 12 work. This change does not claim full payroll completion.

Verification: 24 backend unit/integration tests passed, including half-day rounding, overtime validation, missing-rate rejection, effective-rate snapshots, concurrent duplicate attendance/payroll, absent-day handling, linked deletion, project cost/cash reconciliation, payment reversal and earlier workflow regressions. Production build and Labour component lint passed. Browser checks confirmed the Workers attendance/rate section and form controls. The existing bundle-size warning remains.
