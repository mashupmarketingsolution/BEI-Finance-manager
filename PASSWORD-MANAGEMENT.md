# Password management

All signed-in users have Change password in the sidebar. Current password and matching new password are required. Admin can use User Access → Reset password for a user, confirming the Admin current password. New passwords use bcrypt cost 12, minimum 8 characters, maximum 72 UTF-8 bytes. Five attempts per 15 minutes per actor are allowed per server process. Passwords and hashes are excluded from audit payloads. Changes increment passwordVersion and invalidate previous JWT sessions for the affected account. Existing pre-upgrade sessions inherit version 1.

Deploy the additive 20261015120000_password_sessions migration and regenerate Prisma BEFORE restarting the updated server. Back up first. No actual account credentials were changed during implementation. Mandatory first-login changes and email recovery are not included.

Verification: 3 backend tests (validation, role access, current-password check/hash/session increment), 13 session UI tests, affected-component lint and production build passed. Prisma generation passed. Local migration execution could not connect successfully to the local database; database/browser end-to-end verification and live deployment remain pending.
