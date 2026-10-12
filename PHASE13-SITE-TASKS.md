# Phase 13: Site Task Management

Implemented 2026-10-12, following the Daily Site Reports foundation.

## Use

Open Site Reports → Site tasks → Add site task. Choose the project, title, assigned active user, priority, start/due dates and status. Optionally enter the work description and blockers, and select daily reports from the same project. Save the task. Use Edit task to move it between Pending, In progress and Completed. Details show the creator, latest editor, completion time and linked reports; daily report details also show linked tasks.

Filters cover project, assigned active user, status, priority, archive state, overdue tasks and title/description/blocker search. Pagination supports 10/20/25/50/100/All. Overdue means an active unfinished task due before today in Asia/Dhaka; tasks due today are not overdue. The overdue filter always excludes archived and completed tasks. Blockers remain visible as text even if the task is completed, until edited.

## Integrity and scope

- Start and due dates are required, and due date cannot precede start date. Future schedules are allowed. Priorities are Low, Normal, High and Urgent.
- Assignment uses existing active user accounts; it does not create users or notify anyone. Unassigned tasks are allowed. An inactive assignee must be replaced or cleared when editing.
- Version checks and row locks reject concurrent stale writes, including archive/restore. Creator/latest editor are recorded, but this is not a full action history or approval system.
- Archive and restore preserve task status and report links. No hard-delete task API is exposed. Project deletion is blocked when any task history exists.
- Task project cannot be changed after creation; archive an incorrect task and create its replacement. A linked report cannot move to another project until unlinked. Report links are validated and locked transactionally, with up to 100 unique report links per task. Archived report links are preserved and cannot be added or removed until that report is restored.
- Completing a task records a completion time; reopening clears it. Editing an already completed task preserves its completion time. Status can be chosen directly without approval.
- Task state does not generate payments, attendance, payroll, stock usage or accounting entries, and does not automatically change reported project progress or project status.
- Role-specific permissions, notifications, inspections and multi-step approvals remain separate roadmap work. Current business APIs require an active login.

## Deployment and verification

Applied migration `20261012110000_site_tasks` with Prisma migrate deploy and regenerated the client. Prisma validation, frontend production build and focused component lint passed. All 32 backend unit/integration tests passed, including task date validation, assignment, cross-project link rejection, stale concurrent edits, overdue/completed behavior, reopening, archive/restore, archived-report link protection, report project integrity and project deletion protection. Integration fixtures were cleaned up. Browser checks verified the task form, active-user/project choices, default dates and project-specific report checkbox without saving real business tasks. The existing frontend bundle-size warning remains.
